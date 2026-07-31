/// <reference path="../deno.ns.d.ts" />

/** Parse comma-separated origins from env (no hardcoded localhost). */
function parseOriginList(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim().replace(/\/+$/, ""))
    .filter(Boolean);
}

/**
 * App origins allowed for CORS, auth redirects, and checkout return URLs.
 *
 * Production: set SITE_URL only (e.g. https://wings.nopejs.me).
 * Local dev: add CORS_EXTRA_ORIGINS=http://localhost:8080,http://localhost:5173
 * to supabase/functions/.env or `supabase secrets set`.
 */
export function allowedAppOrigins(): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  const push = (origin: string) => {
    const normalized = origin.trim().replace(/\/+$/, "");
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    out.push(normalized);
  };

  push(Deno.env.get("SITE_URL") ?? "");
  for (const origin of parseOriginList(Deno.env.get("CORS_EXTRA_ORIGINS"))) {
    push(origin);
  }

  return out;
}

export function isAllowedAppOrigin(origin: string): boolean {
  try {
    return allowedAppOrigins().includes(new URL(origin).origin);
  } catch {
    return false;
  }
}

export function isAllowedAppUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    return allowedAppOrigins().includes(u.origin);
  } catch {
    return false;
  }
}
