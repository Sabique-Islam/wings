import { serializeVaultMarkdown, entryToRelativePath } from "./frontmatter";
import type { Entry } from "@/lib/journal";
import { contentHash } from "./types";
import { readVaultMeta, putVaultMeta, type VaultMetaRow } from "@/lib/localStore";
import { getTagsForEntry } from "@/lib/linkIndex";
import { ensureVaultPermission } from "./store";

/** Best-effort cleanup: an already-missing file is a normal outcome here. */
async function removeVaultFile(root: FileSystemDirectoryHandle, relativePath: string): Promise<void> {
  const parts = relativePath.split("/");
  const fileName = parts.pop()!;
  try {
    let dir = root;
    for (const part of parts) {
      dir = await dir.getDirectoryHandle(part);
    }
    await dir.removeEntry(fileName);
  } catch {
    // The user may have moved or deleted it themselves.
  }
}

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

  // The path is derived from the title and the parent chain, so renaming or
  // moving a page leaves a stale duplicate behind unless the old one goes.
  // Only after the new file is safely on disk.
  const previousPath = meta.lastWrittenPath?.[entry.id];
  if (previousPath && previousPath !== relativePath) {
    await removeVaultFile(handle, previousPath);
  }

  return {
    ...meta,
    lastWrittenAt: { ...meta.lastWrittenAt, [entry.id]: Date.now() },
    lastWrittenHash: { ...meta.lastWrittenHash, [entry.id]: contentHash(entry.content) },
    lastWrittenPath: { ...meta.lastWrittenPath, [entry.id]: relativePath },
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

/**
 * Records a failed mirror so the folder cannot quietly fall behind the app.
 *
 * Only the first failure in a run raises a toast: once the folder is gone or
 * permission has lapsed every subsequent save fails the same way, and the
 * banner in settings is the durable signal.
 */
async function recordMirrorFailure(meta: VaultMetaRow, message: string): Promise<void> {
  const alreadyFailing = meta.lastError != null;
  await putVaultMeta({ ...meta, lastError: { message, at: Date.now() } });
  if (!alreadyFailing && typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("nw:vault-error", { detail: message }));
  }
}

export async function mirrorEntryToVault(
  userId: string,
  entry: Entry,
  allEntries: Entry[],
): Promise<void> {
  const meta = await readVaultMeta(userId);
  if (!meta?.handle) return;
  try {
    if (!(await ensureVaultPermission(meta))) {
      await recordMirrorFailure(meta, "Wings no longer has permission to write to the folder.");
      return;
    }
    const updated = await writeEntryToVault(meta.handle, entry, allEntries, meta);
    await putVaultMeta({ ...updated, lastError: null });
  } catch (err) {
    console.warn("[wings] vault mirror failed", err);
    await recordMirrorFailure(meta, err instanceof Error ? err.message : "Could not write the file.");
  }
}
