/** A page edited in Wings and in the folder since the last sync. */
export interface VaultConflict {
  entryId: string;
  title: string;
  relativePath: string;
  /** What the file on disk currently says. */
  fileBody: string;
}

export interface VaultSyncResult {
  created: number;
  updated: number;
  skipped: number;
  conflicts: VaultConflict[];
}

export interface VaultFileEntry {
  wingsId: string | null;
  title: string | null;
  content: string;
  /** Frontmatter tags, already lowercased by the parser. */
  tags: string[];
  relativePath: string;
  lastModified: number;
}

export function isVaultSupported(): boolean {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

/**
 * Canonical form for comparing a page against its file on disk.
 *
 * Line endings and trailing whitespace differ between what the editor stores
 * and what a text editor writes back. Hashing those differences makes an
 * untouched file look edited, which surfaces to the user as a false conflict.
 */
export function normalizeVaultContent(content: string): string {
  return content.replace(/\r\n?/g, "\n").replace(/[ \t]+$/gm, "").trim();
}

/** Change-detection hash. Two accumulators keep accidental collisions remote. */
export function contentHash(content: string): string {
  const normalized = normalizeVaultContent(content);
  let hash = 0x811c9dc5;
  let mix = 0;
  for (let i = 0; i < normalized.length; i++) {
    const code = normalized.charCodeAt(i);
    hash = Math.imul(hash ^ code, 16777619);
    mix = (Math.imul(mix, 31) + code) | 0;
  }
  return `${(hash >>> 0).toString(36)}.${(mix >>> 0).toString(36)}`;
}
