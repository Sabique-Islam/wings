/// <reference path="../deno.ns.d.ts" />

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeadersFor } from "../_shared/cors.ts";
import { fetchHtmlSafe, isPublicUrl } from "../_shared/ssrf.ts";

const MAX_BODY_BYTES = 2048;
const FETCH_TIMEOUT_MS = 5000;

function extractMeta(html: string, property: string): string {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`,
    "i",
  );
  const m = html.match(re);
  return m?.[1]?.trim() ?? "";
}

function extractTitle(html: string): string {
  return (
    extractMeta(html, "og:title") ||
    extractMeta(html, "twitter:title") ||
    html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ||
    ""
  );
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

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "unauthorized" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !supabaseAnonKey) return json({ error: "server misconfigured" }, 500);

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: userError } = await userClient.auth.getUser();
  if (userError || !user) return json({ error: "unauthorized" }, 401);

  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) return json({ error: "payload too large" }, 413);

  let body: { url?: string };
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ error: "invalid request" }, 400);
  }

  const url = body.url?.trim();
  if (!url || !isPublicUrl(url)) return json({ error: "invalid url" }, 400);

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const res = await fetchHtmlSafe(url, controller.signal);
    clearTimeout(timer);
    if (!res || !res.ok) return json({ title: new URL(url).hostname }, 200);

    const html = (await res.text()).slice(0, 120_000);
    const title = extractTitle(html) || new URL(url).hostname;
    const description = extractMeta(html, "og:description") || extractMeta(html, "description");
    let favicon = extractMeta(html, "og:image");
    if (!favicon) {
      try {
        favicon = new URL("/favicon.ico", url).href;
      } catch {
        favicon = "";
      }
    }

    return json({ title, description, favicon });
  } catch {
    try {
      return json({ title: new URL(url).hostname }, 200);
    } catch {
      return json({ error: "fetch failed" }, 502);
    }
  }
});
