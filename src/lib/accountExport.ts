import { zipSync } from "fflate";
import type { Entry } from "@/lib/journal";
import { createEntry, updateEntry, moveEntry } from "@/lib/journal";
import { payloadFromMarkdown } from "@/lib/entryContent";
import { getTagsForEntry } from "@/lib/linkIndex";
import { isLocalEntry, persistEntryBody } from "@/lib/localContent";
import {
  entryToRelativePath,
  parentPathForFile,
  parseVaultMarkdown,
  serializeVaultMarkdown,
} from "@/lib/vault/frontmatter";
import type { VaultFileEntry } from "@/lib/vault/types";

export interface AccountExportFile {
  relativePath: string;
  markdown: string;
}

const PAGE_LINK_ID = /#page:([^)\s]+)/gi;

/** Rewrite internal page links after an import assigns new ids. */
export function rewritePageLinkIds(markdown: string, idMap: Map<string, string>): string {
  return markdown.replace(PAGE_LINK_ID, (match, id: string) => {
    const next = idMap.get(id);
    return next ? `#page:${next}` : match;
  });
}

function pathDepth(relativePath: string): number {
  return relativePath.split("/").length;
}

function normalizeBody(title: string | null, content: string): string {
  if (title && !content.trimStart().startsWith("#")) {
    return `# ${title}\n\n${content}`.trim();
  }
  return content.trim();
}

/** Build vault-format markdown files — same layout as the connected vault folder. */
export function buildAccountExportFiles(entries: Entry[]): AccountExportFile[] {
  const live = entries.filter((e) => !e.deleted_at);
  const byId = new Map(live.map((e) => [e.id, e]));
  return live.map((entry) => ({
    relativePath: entryToRelativePath(entry, byId),
    markdown: serializeVaultMarkdown(entry, getTagsForEntry(entry.id)),
  }));
}

export function buildAccountExportZipBlob(entries: Entry[]): {
  blob: Blob;
  count: number;
  filename: string;
} {
  const files = buildAccountExportFiles(entries);
  const zipInput: Record<string, Uint8Array> = {};
  const enc = new TextEncoder();
  for (const { relativePath, markdown } of files) {
    zipInput[relativePath] = enc.encode(markdown);
  }
  const date = new Date().toISOString().slice(0, 10);
  return {
    blob: new Blob([zipSync(zipInput)], { type: "application/zip" }),
    count: files.length,
    filename: `wings-account-${date}.zip`,
  };
}

/** Download every page as a zip of vault-layout markdown files. */
export function downloadAccountExport(entries: Entry[]): number {
  const { blob, count, filename } = buildAccountExportZipBlob(entries);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  return count;
}

/** Turn a folder/file pick into vault scan rows. */
export async function vaultFilesFromFileList(files: File[]): Promise<VaultFileEntry[]> {
  const out: VaultFileEntry[] = [];
  for (const file of files) {
    if (!/\.md$/i.test(file.name)) continue;
    const relativePath =
      (file as File & { webkitRelativePath?: string }).webkitRelativePath?.replace(/\\/g, "/") ??
      file.name;
    const parsed = parseVaultMarkdown(await file.text());
    out.push({
      wingsId: parsed.wingsId,
      title: parsed.title,
      content: parsed.body,
      tags: parsed.tags,
      relativePath,
      lastModified: file.lastModified,
    });
  }
  return out;
}

export interface AccountImportResult {
  entries: Entry[];
  created: number;
  updated: number;
}

/**
 * Import a vault-format export folder: hierarchy from paths, links via wings_id remap.
 * Matches existing pages by `wings_id` when re-importing into the same account.
 */
export async function importVaultExportFiles(
  files: VaultFileEntry[],
  userId: string,
  existingEntries: Entry[],
  opts: { allEntriesForLocalSave?: Entry[] } = {},
): Promise<AccountImportResult> {
  const existingById = new Map(existingEntries.map((e) => [e.id, e]));
  const sorted = [...files]
    .filter((f) => f.relativePath.toLowerCase().endsWith(".md"))
    .filter((f) => f.content.trim().length > 0 || f.title)
    .sort((a, b) => pathDepth(a.relativePath) - pathDepth(b.relativePath));

  const idByPath = new Map<string, string>();
  const oldToNew = new Map<string, string>();
  const staged: Array<{ entry: Entry; body: string; parentId: string | null; isNew: boolean }> = [];

  for (const file of sorted) {
    const normalizedPath = file.relativePath.replace(/\\/g, "/");
    const parentPath = parentPathForFile(normalizedPath);
    const parentId = parentPath ? (idByPath.get(parentPath) ?? null) : null;
    const body = normalizeBody(file.title, file.content);

    const matched = file.wingsId ? existingById.get(file.wingsId) : undefined;
    let entry: Entry;
    let isNew = false;

    if (matched && matched.user_id === userId) {
      entry = matched;
      oldToNew.set(file.wingsId!, entry.id);
    } else {
      entry = await createEntry(userId, body, parentId ?? undefined);
      isNew = true;
      if (file.wingsId) oldToNew.set(file.wingsId, entry.id);
      existingById.set(entry.id, entry);
    }

    idByPath.set(normalizedPath, entry.id);
    staged.push({ entry, body, parentId, isNew });
  }

  let created = 0;
  let updated = 0;
  const merged = new Map(existingEntries.map((e) => [e.id, e]));

  for (const row of staged) {
    const rewritten = rewritePageLinkIds(row.body, oldToNew);
    const payload = payloadFromMarkdown(rewritten);
    let entry = row.entry;

    if (row.parentId !== entry.parent_id) {
      await moveEntry(entry.id, row.parentId);
      entry = { ...entry, parent_id: row.parentId };
    }

    const bodyChanged = entry.content !== payload.markdown;
    if (bodyChanged) {
      if (isLocalEntry(entry)) {
        const all = opts.allEntriesForLocalSave ?? [...existingEntries, entry];
        await persistEntryBody(userId, entry, all, payload);
      } else {
        await updateEntry(entry.id, payload);
      }
      entry = { ...entry, content: payload.markdown, content_json: payload.json };
      if (row.isNew) created += 1;
      else updated += 1;
    } else if (row.isNew) {
      created += 1;
    }

    merged.set(entry.id, entry);
  }

  return {
    entries: Array.from(merged.values()),
    created,
    updated,
  };
}
