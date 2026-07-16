/// <reference path="../deno.ns.d.ts" />

import { corsHeadersFor } from "../_shared/cors.ts";

const MAX_BODY_BYTES = 2048;
const FETCH_TIMEOUT_MS = 5000;

/** Block private/reserved hosts for SSRF safety. */
function isPublicUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    const host = u.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host.endsWith(".local") ||
      host.startsWith("127.") ||
      host.startsWith("10.") ||
      host.startsWith("192.168.") ||
      host.startsWith("169.254.") ||
      host === "[::1]" ||
      host === "0.0.0.0"
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function extractMeta(html: string, property: string): string {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`,
    "i",
  );
  const m = html.match(re);
  return m?.[1]?.trim() ?? "";
}

function extractTitle(html: string): string {
  return extractMeta(html, "og:title") || extractMeta(html, "twitter:title") || html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ?? "";
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
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "WingsLinkPreview/1.0", Accept: "text/html" },
      redirect: "follow",
    });
    clearTimeout(timer);
    if (!res.ok) return json({ title: new URL(url).hostname }, 200);

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
