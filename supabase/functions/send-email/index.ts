/// <reference path="../deno.ns.d.ts" />

// App transactional email — share invites only. The invite URL, role, and title
// are all derived server-side from the database; the client body is treated as
// untrusted (only entry_id + recipient are read from it).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeadersFor } from "../_shared/cors.ts";
import { sendShareInviteMail, siteUrl } from "../_shared/mail.ts";

const MAX_BODY_BYTES = 8 * 1024;
const RATE_LIMIT_PER_HOUR = 40;

interface ShareInviteBody {
  type: "share_invite";
  to: string;
  entry_id: string;
}

Deno.serve(async (req) => {
  const cors = corsHeadersFor(req);
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, "Content-Type": "application/json" },
    });

  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const contentType = req.headers.get("Content-Type") || "";
  if (!contentType.includes("application/json")) {
    return json({ error: "invalid request" }, 415);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "unauthorized" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !anonKey || !serviceKey) {
    console.error("send-email: missing supabase configuration");
    return json({ error: "service unavailable" }, 503);
  }

  // Identify the caller from their JWT (RLS-scoped client).
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: userError } = await userClient.auth.getUser();
  if (userError || !user?.email) return json({ error: "unauthorized" }, 401);

  // Enforce body-size cap before parsing.
  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) return json({ error: "payload too large" }, 413);

  let body: ShareInviteBody;
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ error: "invalid request" }, 400);
  }

  if (body?.type !== "share_invite") return json({ error: "invalid request" }, 400);

  const to = body.to?.trim().toLowerCase();
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return json({ error: "invalid request" }, 400);
  }
  const entryId = body.entry_id;
  if (!entryId || !/^[0-9a-f-]{36}$/i.test(entryId)) {
    return json({ error: "invalid request" }, 400);
  }
  if (to === user.email.toLowerCase()) {
    return json({ error: "invalid request" }, 400);
  }

  // Service-role client for authorization checks and rate limiting.
  const admin = createClient(supabaseUrl, serviceKey);

  try {
    // 1) Caller must own the entry or be an admin share on it.
    const { data: entry, error: entryErr } = await admin
      .from("entries")
      .select("id, title, user_id")
      .eq("id", entryId)
      .maybeSingle();
    if (entryErr || !entry) return json({ error: "not found" }, 404);

    let authorized = entry.user_id === user.id;
    if (!authorized) {
      const { data: adminShare } = await admin
        .from("entry_shares")
        .select("id")
        .eq("entry_id", entryId)
        .eq("role", "admin")
        .or(`shared_with_user_id.eq.${user.id},shared_with_email.eq.${user.email.toLowerCase()}`)
        .maybeSingle();
      authorized = !!adminShare;
    }
    if (!authorized) return json({ error: "forbidden" }, 403);

    // 2) A share row for the recipient must already exist (invite ≠ arbitrary send).
    const { data: recipientShare, error: shareErr } = await admin
      .from("entry_shares")
      .select("role")
      .eq("entry_id", entryId)
      .eq("shared_with_email", to)
      .maybeSingle();
    if (shareErr || !recipientShare) return json({ error: "forbidden" }, 403);

    // 3) Per-user rate limit.
    const sinceHour = new Date(Date.now() - 3600_000).toISOString();
    const { count } = await admin
      .from("email_send_log")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", sinceHour);
    if ((count ?? 0) >= RATE_LIMIT_PER_HOUR) {
      return json({ error: "rate limited" }, 429);
    }

    // 4) Build everything server-side. Deep-link to the authenticated note.
    const inviterLabel = user.email.split("@")[0] || user.email;
    const url = `${siteUrl().replace(/\/+$/, "")}/n/${entry.id}`;

    await sendShareInviteMail({
      to,
      inviterLabel,
      entryTitle: entry.title || "Untitled",
      role: recipientShare.role || "viewer",
      url,
      entryId: entry.id,
    });

    await admin.from("email_send_log").insert({ user_id: user.id, kind: "share_invite" });

    return json({ ok: true });
  } catch (e) {
    console.error("send-email failed");
    return json({ error: "send failed" }, 500);
  }
});
