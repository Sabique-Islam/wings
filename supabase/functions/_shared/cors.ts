/// <reference path="../deno.ns.d.ts" />

// Origin allowlist — no wildcard. Extra origins can be added via the
// CORS_EXTRA_ORIGINS env var (comma-separated) without a redeploy.
const DEFAULT_ALLOWED_ORIGINS = [
  "https://wings.nopejs.me",
  "http://localhost:8080",
  "http://localhost:5173",
];

function allowedOrigins(): string[] {
  const extra = (Deno.env.get("CORS_EXTRA_ORIGINS") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const site = Deno.env.get("SITE_URL");
  return [...DEFAULT_ALLOWED_ORIGINS, ...(site ? [site] : []), ...extra];
}

/** CORS headers scoped to the request's Origin when it's allowlisted. */
export function corsHeadersFor(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") || "";
  const allowed = allowedOrigins().includes(origin);
  return {
    "Access-Control-Allow-Origin": allowed ? origin : DEFAULT_ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}
