/// Shared SSRF guards for server-side URL fetching (Supabase Edge).
///
/// Localhost/private hosts are always blocked here: the edge runtime would fetch
/// its own infra, not your dev machine. Dev vs prod for *your app* is configured
/// via SITE_URL / CORS_EXTRA_ORIGINS in origins.ts — not by loosening SSRF rules.

const MAX_REDIRECTS = 3;

function normalizeHost(hostname: string): string {
  return hostname.toLowerCase().replace(/^\[|\]$/g, "");
}

/** True when the host must not be fetched (RFC1918, link-local, metadata, etc.). */
export function isBlockedHost(hostname: string): boolean {
  const host = normalizeHost(hostname);
  if (!host) return true;

  if (
    host === "localhost" ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.endsWith(".localhost")
  ) {
    return true;
  }

  if (host === "0.0.0.0" || host.startsWith("127.")) return true;
  if (host.startsWith("10.")) return true;
  if (host.startsWith("192.168.")) return true;
  if (host.startsWith("169.254.")) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return true;

  if (host === "metadata.google.internal" || host === "metadata.goog") return true;

  if (host === "::1" || host === "::") return true;
  if (host.startsWith("fe80:") || host.startsWith("fc") || host.startsWith("fd")) return true;

  return false;
}

/** True only for absolute http(s) URLs to public hosts (no embedded credentials). */
export function isPublicUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    if (u.username || u.password) return false;
    return !isBlockedHost(u.hostname);
  } catch {
    return false;
  }
}

/** Fetch HTML with manual redirect handling; each hop re-validates the target URL. */
export async function fetchHtmlSafe(
  startUrl: string,
  signal: AbortSignal,
): Promise<Response | null> {
  let current = startUrl;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const res = await fetch(current, {
      signal,
      redirect: "manual",
      headers: { "User-Agent": "WingsLinkPreview/1.0", Accept: "text/html" },
    });

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) return null;
      let next: string;
      try {
        next = new URL(location, current).href;
      } catch {
        return null;
      }
      if (!isPublicUrl(next)) return null;
      current = next;
      continue;
    }

    return res;
  }

  return null;
}
