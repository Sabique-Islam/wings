import { serializeVaultMarkdown, entryToRelativePath } from "./frontmatter";
import type { Entry } from "@/lib/journal";
import { contentHash } from "./types";
import { readVaultMeta, putVaultMeta, type VaultMetaRow } from "@/lib/localStore";
import { getTagsForEntry } from "@/lib/linkIndex";
import { ensureVaultPermission } from "./store";

export async function writeEntryToVault(
  handle: FileSystemDirectoryHandle,
  entry: Entry,
  allEntries: Entry[],
  meta: VaultMetaRow,
): Promise<VaultMetaRow> {
  const entriesById = new Map(allEntries.map((e) => [e.id, e]));
  const relativePath = entryToRelativePath(entry, entriesById);
  const tags = getTagsForEntry(entry.id);
  const markdown = serializeVaultMarkdown(entry, tags);

  const parts = relativePath.split("/");
  const fileName = parts.pop()!;
  let dir = handle;
  for (const part of parts) {
    dir = await dir.getDirectoryHandle(part, { create: true });
  }
  const fileHandle = await dir.getFileHandle(fileName, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(markdown);
  await writable.close();

  const hash = contentHash(entry.content);
  return {
    ...meta,
    lastWrittenAt: { ...meta.lastWrittenAt, [entry.id]: Date.now() },
    lastWrittenHash: { ...meta.lastWrittenHash, [entry.id]: hash },
  };
}

export async function writeAllEntriesToVault(
  handle: FileSystemDirectoryHandle,
  entries: Entry[],
  meta: VaultMetaRow,
): Promise<VaultMetaRow> {
  let next = meta;
  for (const entry of entries) {
    next = await writeEntryToVault(handle, entry, entries, next);
  }
  await putVaultMeta(next);
  return next;
}

export async function mirrorEntryToVault(
  userId: string,
  entry: Entry,
  allEntries: Entry[],
): Promise<void> {
  const meta = await readVaultMeta(userId);
  if (!meta?.handle) return;
  try {
    if (!(await ensureVaultPermission(meta))) return;
    const updated = await writeEntryToVault(meta.handle, entry, allEntries, meta);
    await putVaultMeta(updated);
  } catch (err) {
    console.warn("[wings] vault mirror failed", err);
  }
}
