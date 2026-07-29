// What one vault file means for the workspace.
//
// Kept free of file-system and network calls so the rules that decide whether a
// file wins, loses, or conflicts can be tested directly — `syncFromVault` only
// carries out the actions returned here.

import type { Entry } from "@/lib/journal";
import { shouldBlockEmptySave } from "@/lib/editorContent";
import { contentHash, normalizeVaultContent, type VaultFileEntry } from "./types";

export type VaultSkipReason = "empty" | "unchanged" | "unknown-page" | "would-empty-page";

export type VaultFileAction =
  | { kind: "create"; body: string }
  | { kind: "update"; body: string }
  | { kind: "conflict" }
  | { kind: "skip"; reason: VaultSkipReason };

/** The hashes and timestamps of what Wings last wrote to the folder. */
export interface VaultWriteLog {
  lastWrittenAt: Record<string, number>;
  lastWrittenHash: Record<string, string>;
}

export function planVaultFileSync(
  file: VaultFileEntry,
  existing: Entry | undefined,
  log: VaultWriteLog,
): VaultFileAction {
  const content = normalizeVaultContent(file.content);
  if (!content) return { kind: "skip", reason: "empty" };

  if (!file.wingsId) {
    // `createEntry` takes no title and Wings falls back to the first heading, so
    // a new file's frontmatter title only survives inside the body itself.
    const body = file.title && !content.startsWith("#") ? `# ${file.title}\n\n${content}` : content;
    return { kind: "create", body };
  }

  if (!existing) return { kind: "skip", reason: "unknown-page" };

  const fileHash = contentHash(content);
  if (fileHash === contentHash(existing.content)) return { kind: "skip", reason: "unchanged" };

  // Wings wrote this page after the file was last touched, so the file is stale
  // and applying it would undo whatever was typed in the app.
  const lastWritten = log.lastWrittenAt[existing.id] ?? 0;
  const lastHash = log.lastWrittenHash[existing.id];
  if (lastHash != null && lastHash !== fileHash && lastWritten > file.lastModified) {
    return { kind: "conflict" };
  }

  if (shouldBlockEmptySave(existing.content, content)) {
    return { kind: "skip", reason: "would-empty-page" };
  }

  return { kind: "update", body: content };
}
