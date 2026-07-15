// URL safety helpers shared by the editor render surfaces (links, bookmarks,
// embeds). Centralized so every sink applies the same protocol/host rules.

/** True only for absolute http(s) URLs. Blocks javascript:, data:, blob:, etc. */
export function isSafeHttpUrl(raw: string | null | undefined): boolean {
  if (!raw) return false;
  try {
    const u = new URL(raw, window.location.origin);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

/** Hosts allowed to be loaded inside an <iframe> embed. */
export const EMBED_ALLOWED_HOSTS = [
  "youtube.com",
  "www.youtube.com",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
  "player.vimeo.com",
  "vimeo.com",
  "www.figma.com",
  "figma.com",
  "codesandbox.io",
  "codepen.io",
  "www.loom.com",
  "loom.com",
  "docs.google.com",
  "drive.google.com",
  "www.google.com",
  "maps.google.com",
];

/** True if url is https and its host (or a parent domain) is in the embed allowlist. */
export function isAllowedEmbedUrl(raw: string | null | undefined): boolean {
  if (!raw) return false;
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:") return false;
    const host = u.hostname.toLowerCase();
    return EMBED_ALLOWED_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
  } catch {
    return false;
  }
}
