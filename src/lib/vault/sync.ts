import { createEntry, getEntryTitle, moveEntry, updateEntry, type Entry } from "@/lib/journal";
import { payloadFromMarkdown } from "@/lib/entryContent";
import { shouldBlockEmptySave } from "@/lib/editorContent";
import { contentHash, normalizeVaultContent, type VaultConflict, type VaultSyncResult } from "./types";
import { entryToRelativePath } from "./frontmatter";
import { parentIdChangeForFile, resolveParentIdFromPath } from "./hierarchy";
import { planVaultFileSync } from "./syncPlan";
import { scanVaultFolder } from "./read";
import { putVaultMeta, type VaultMetaRow } from "@/lib/localStore";
import { writeEntryToVault } from "./write";

function markWritten(meta: VaultMetaRow, entryId: string, content: string): VaultMetaRow {
  return {
    ...meta,
    lastWrittenAt: { ...meta.lastWrittenAt, [entryId]: Date.now() },
    lastWrittenHash: { ...meta.lastWrittenHash, [entryId]: contentHash(content) },
  };
}

async function applyVaultParent(
  entry: Entry,
  relativePath: string,
  idByPath: Map<string, string>,
): Promise<Entry> {
  const parentChange = parentIdChangeForFile(relativePath, entry, idByPath);
  if (parentChange === undefined) return entry;
  await moveEntry(entry.id, parentChange);
  return { ...entry, parent_id: parentChange };
}

export async function syncFromVault(
  userId: string,
  handle: FileSystemDirectoryHandle,
  existingEntries: Entry[],
  meta: VaultMetaRow,
  onEntriesChanged: (entries: Entry[]) => void,
): Promise<{ result: VaultSyncResult; meta: VaultMetaRow }> {
  const files = await scanVaultFolder(handle);
  const byId = new Map(existingEntries.map((e) => [e.id, e]));
  const result: VaultSyncResult = { created: 0, updated: 0, skipped: 0, conflicts: [] };
  let nextEntries = [...existingEntries];
  let nextMeta = { ...meta };

  const idByPath = new Map(existingEntries.map((e) => [entryToRelativePath(e, byId), e.id]));
  const depth = (path: string) => path.split("/").length;
  files.sort((a, b) => depth(a.relativePath) - depth(b.relativePath));

  for (const file of files) {
    const existing = file.wingsId ? byId.get(file.wingsId) : undefined;
    const action = planVaultFileSync(file, existing, meta);

    if (action.kind === "skip") {
      if (existing) {
        const withParent = await applyVaultParent(existing, file.relativePath, idByPath);
        if (withParent !== existing) {
          nextEntries = nextEntries.map((e) => (e.id === withParent.id ? withParent : e));
          byId.set(withParent.id, withParent);
          idByPath.set(file.relativePath, withParent.id);
          result.updated += 1;
          continue;
        }
      }
      result.skipped += 1;
      continue;
    }

    if (action.kind === "conflict") {
      result.conflicts.push({
        entryId: existing!.id,
        title: getEntryTitle(existing!),
        relativePath: file.relativePath,
        fileBody: normalizeVaultContent(file.content),
      });
      continue;
    }

    if (action.kind === "create") {
      const parentId = resolveParentIdFromPath(file.relativePath, idByPath);
      const created = await createEntry(userId, action.body, parentId ?? undefined);
      const withParent = await applyVaultParent(created, file.relativePath, idByPath);
      nextEntries = [withParent, ...nextEntries];
      byId.set(withParent.id, withParent);
      idByPath.set(file.relativePath, withParent.id);
      result.created += 1;
      nextMeta = await writeEntryToVault(handle, withParent, nextEntries, nextMeta);
      continue;
    }

    const target = existing!;
    const payload = payloadFromMarkdown(action.body);
    await updateEntry(target.id, payload);
    let updated: Entry = { ...target, content: payload.markdown, content_json: payload.json };
    updated = await applyVaultParent(updated, file.relativePath, idByPath);
    nextEntries = nextEntries.map((e) => (e.id === updated.id ? updated : e));
    byId.set(updated.id, updated);
    idByPath.set(file.relativePath, updated.id);
    result.updated += 1;
    nextMeta = markWritten(nextMeta, updated.id, payload.markdown);
  }

  onEntriesChanged(nextEntries);
  await putVaultMeta(nextMeta);
  return { result, meta: nextMeta };
}

export async function resolveVaultConflict(
  handle: FileSystemDirectoryHandle,
  conflict: VaultConflict,
  winner: "page" | "file",
  entries: Entry[],
  meta: VaultMetaRow,
): Promise<{ entries: Entry[]; meta: VaultMetaRow }> {
  const target = entries.find((e) => e.id === conflict.entryId);
  if (!target) return { entries, meta };

  if (winner === "page") {
    const nextMeta = await writeEntryToVault(handle, target, entries, meta);
    await putVaultMeta(nextMeta);
    return { entries, meta: nextMeta };
  }

  const payload = payloadFromMarkdown(conflict.fileBody);
  if (shouldBlockEmptySave(target.content, payload.markdown)) return { entries, meta };
  await updateEntry(target.id, payload);
  const updated: Entry = { ...target, content: payload.markdown, content_json: payload.json };
  const nextMeta = markWritten(meta, updated.id, payload.markdown);
  await putVaultMeta(nextMeta);
  return { entries: entries.map((e) => (e.id === updated.id ? updated : e)), meta: nextMeta };
}
