import { createEntry, updateEntry, type Entry } from "@/lib/journal";
import { shouldBlockEmptySave } from "@/lib/editorContent";
import { payloadFromMarkdown } from "@/lib/entryContent";
import { contentHash, type VaultSyncResult } from "./types";
import { scanVaultFolder } from "./read";
import { putVaultMeta, type VaultMetaRow } from "@/lib/localStore";
import { writeEntryToVault } from "./write";

export async function syncFromVault(
  userId: string,
  handle: FileSystemDirectoryHandle,
  existingEntries: Entry[],
  meta: VaultMetaRow,
  onEntriesChanged: (entries: Entry[]) => void,
): Promise<{ result: VaultSyncResult; meta: VaultMetaRow }> {
  const files = await scanVaultFolder(handle);
  const byId = new Map(existingEntries.map((e) => [e.id, e]));
  const result: VaultSyncResult = { created: 0, updated: 0, skipped: 0, conflicts: 0 };
  let nextEntries = [...existingEntries];
  let nextMeta = { ...meta };

  for (const file of files) {
    const body =
      file.title && !file.content.startsWith("#")
        ? `# ${file.title}\n\n${file.content}`
        : file.content;

    if (body.trim().length === 0) {
      result.skipped += 1;
      continue;
    }

    if (!file.wingsId) {
      const created = await createEntry(userId, body);
      nextEntries = [created, ...nextEntries];
      byId.set(created.id, created);
      result.created += 1;
      nextMeta = await writeEntryToVault(handle, created, nextEntries, nextMeta);
      continue;
    }

    const existing = byId.get(file.wingsId);
    if (!existing) {
      result.skipped += 1;
      continue;
    }

    const fileHash = contentHash(body);
    const entryHash = contentHash(existing.content);
    if (fileHash === entryHash) {
      result.skipped += 1;
      continue;
    }

    const lastWritten = meta.lastWrittenAt[existing.id] ?? 0;
    const lastHash = meta.lastWrittenHash[existing.id];
    const wingsNewer = lastHash != null && lastHash !== fileHash && lastWritten > file.lastModified;

    if (wingsNewer) {
      result.conflicts += 1;
      continue;
    }

    if (shouldBlockEmptySave(existing.content, body)) {
      result.skipped += 1;
      continue;
    }

    const payload = payloadFromMarkdown(body);
    await updateEntry(existing.id, payload);
    const updated: Entry = {
      ...existing,
      content: payload.markdown,
      content_json: payload.json,
    };
    nextEntries = nextEntries.map((e) => (e.id === updated.id ? updated : e));
    byId.set(updated.id, updated);
    result.updated += 1;
    nextMeta = {
      ...nextMeta,
      lastWrittenAt: { ...nextMeta.lastWrittenAt, [updated.id]: Date.now() },
      lastWrittenHash: { ...nextMeta.lastWrittenHash, [updated.id]: fileHash },
    };
  }

  onEntriesChanged(nextEntries);
  await putVaultMeta(nextMeta);
  return { result, meta: nextMeta };
}
