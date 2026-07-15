// Supabase Auth "Send Email" hook — Resend SDK (html/text).
// Docs: https://supabase.com/docs/guides/auth/auth-hooks/send-email-hook

import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";
import {
  sendMagicLinkMail,
  sendNotificationMail,
  siteUrl,
  supabaseUrl,
} from "../_shared/mail.ts";

interface HookPayload {
  user: { id: string; email: string; new_email?: string };
  email_data: {
    token: string;
    token_hash: string;
    token_new?: string;
    token_hash_new?: string;
    redirect_to: string;
    email_action_type: string;
  };
}

const JSON_HEADERS = { "Content-Type": "application/json" };

/** Supabase only reads error bodies when the hook returns HTTP 200/202. */
function hookOk(): Response {
  return new Response(JSON.stringify({}), { status: 200, headers: JSON_HEADERS });
}

function hookError(message: string, httpCode = 500): Response {
  return new Response(
    JSON.stringify({ error: { message, http_code: httpCode } }),
    { status: 200, headers: JSON_HEADERS },
  );
}

function webhookHeaders(req: Request): Record<string, string> {
  const get = (name: string) => req.headers.get(name) ?? req.headers.get(name.toLowerCase()) ?? "";
  return {
    "webhook-id": get("webhook-id"),
    "webhook-timestamp": get("webhook-timestamp"),
    "webhook-signature": get("webhook-signature"),
  };
}

/** Accepts `v1,whsec_<b64>`, `whsec_<b64>`, or raw base64 — normalizes to what standardwebhooks expects. */
function hookSecret(): string | null {
  const raw = Deno.env.get("SEND_EMAIL_HOOK_SECRET")?.trim().replace(/^["']|["']$/g, "");
  if (!raw) return null;
  return raw.replace(/^v1,/, "").replace(/^whsec_/, "");
}

function verifyUrl(tokenHash: string, actionType: string, redirectTo: string): string {
  const base = supabaseUrl();
  if (!base) throw new Error("SUPABASE_URL not configured for auth-send-email");
  const params = new URLSearchParams({
    token: tokenHash,
    type: actionType,
    redirect_to: redirectTo || siteUrl(),
  });
  return `${base}/auth/v1/verify?${params.toString()}`;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return hookError("method not allowed", 405);
  }

  const secret = hookSecret();
  if (!secret) {
    console.error("auth-send-email: SEND_EMAIL_HOOK_SECRET missing");
    return hookError("SEND_EMAIL_HOOK_SECRET not configured", 500);
  }

  const payload = await req.text();
  const headers = webhookHeaders(req);

  try {
    const wh = new Webhook(secret);
    const { user, email_data } = wh.verify(payload, headers) as HookPayload;
    const action = email_data.email_action_type;

    const notification = await sendNotificationMail({
      to: user.email,
      action,
      userId: user.id,
    });
    if (notification) return hookOk();

    const redirectTo = email_data.redirect_to || siteUrl();

    if (action === "email_change" && user.new_email && email_data.token_hash_new) {
      // Secure email change: confirm on both addresses. Note the reversed hash
      // mapping (token_hash_new → current email) — Supabase quirk, documented.
      // Parallel send: the hook has a 5s total budget including retries.
      await Promise.all([
        sendMagicLinkMail({
          to: user.email,
          action,
          verifyUrl: verifyUrl(email_data.token_hash_new, action, redirectTo),
          userId: user.id,
          tokenHash: email_data.token_hash_new,
        }),
        sendMagicLinkMail({
          to: user.new_email,
          action,
          verifyUrl: verifyUrl(email_data.token_hash, action, redirectTo),
          userId: user.id,
          tokenHash: email_data.token_hash,
        }),
      ]);
    } else {
      const recipient = action === "email_change" && user.new_email ? user.new_email : user.email;
      await sendMagicLinkMail({
        to: recipient,
        action,
        verifyUrl: verifyUrl(email_data.token_hash, action, redirectTo),
        userId: user.id,
        tokenHash: email_data.token_hash,
      });
    }

    return hookOk();
  } catch (e) {
    console.error("auth-send-email:", e);
    const message = e instanceof Error ? e.message : "send failed";
    return hookError(message, 500);
  }
});
