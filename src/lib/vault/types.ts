export interface VaultSyncResult {
  created: number;
  updated: number;
  skipped: number;
  conflicts: number;
}

export interface VaultFileEntry {
  wingsId: string | null;
  title: string | null;
  content: string;
  relativePath: string;
  lastModified: number;
}

export function isVaultSupported(): boolean {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

export function contentHash(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    hash = (hash * 31 + content.charCodeAt(i)) | 0;
  }
  return String(hash);
}
