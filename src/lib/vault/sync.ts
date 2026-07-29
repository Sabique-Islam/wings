import { createEntry, getEntryTitle, moveEntry, updateEntry, updateEntryProperties, type Entry } from "@/lib/journal";
import { payloadFromMarkdown } from "@/lib/entryContent";
import { shouldBlockEmptySave } from "@/lib/editorContent";
import { contentHash, normalizeVaultContent, type VaultConflict, type VaultSyncResult } from "./types";
import { entryToRelativePath } from "./frontmatter";
import { parentIdChangeForFile, propertiesWithVaultTags, resolveParentIdFromPath } from "./hierarchy";
import { planVaultFileSync } from "./syncPlan";
import { scanVaultFolder } from "./read";
import { putVaultMeta, type VaultMetaRow } from "@/lib/localStore";
import { writeEntryToVault } from "./write";

/** Records that a page and its file now agree, so the next sync skips them. */
function markWritten(meta: VaultMetaRow, entryId: string, content: string): VaultMetaRow {
  return {
    ...meta,
    lastWrittenAt: { ...meta.lastWrittenAt, [entryId]: Date.now() },
    lastWrittenHash: { ...meta.lastWrittenHash, [entryId]: contentHash(content) },
  };
}

async function applyVaultMetadata(
  entry: Entry,
  relativePath: string,
  tags: string[],
  idByPath: Map<string, string>,
): Promise<Entry> {
  let next = entry;

  const parentChange = parentIdChangeForFile(relativePath, next, idByPath);
  if (parentChange !== undefined) {
    await moveEntry(next.id, parentChange);
    next = { ...next, parent_id: parentChange };
  }

  const properties = propertiesWithVaultTags(next.properties, tags);
  if (properties) {
    await updateEntryProperties(next.id, properties);
    next = { ...next, properties };
  }

  return next;
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

  // Folder layout carries the page hierarchy, so a file in `projects/alpha/`
  // belongs under the page written as `projects/alpha.md`. Shallow files come
  // first so a parent exists before anything tries to nest beneath it.
  const idByPath = new Map(existingEntries.map((e) => [entryToRelativePath(e, byId), e.id]));
  const depth = (path: string) => path.split("/").length;
  files.sort((a, b) => depth(a.relativePath) - depth(b.relativePath));

  for (const file of files) {
    const existing = file.wingsId ? byId.get(file.wingsId) : undefined;
    const action = planVaultFileSync(file, existing, meta);

    if (action.kind === "skip") {
      // Path or tags can still change when the body is unchanged.
      if (existing) {
        const withMeta = await applyVaultMetadata(existing, file.relativePath, file.tags, idByPath);
        if (withMeta !== existing) {
          nextEntries = nextEntries.map((e) => (e.id === withMeta.id ? withMeta : e));
          byId.set(withMeta.id, withMeta);
          idByPath.set(file.relativePath, withMeta.id);
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
      const withMeta = await applyVaultMetadata(created, file.relativePath, file.tags, idByPath);
      nextEntries = [withMeta, ...nextEntries];
      byId.set(withMeta.id, withMeta);
      idByPath.set(file.relativePath, withMeta.id);
      result.created += 1;
      // Stamp the new page's id into the file so the next sync recognises it.
      nextMeta = await writeEntryToVault(handle, withMeta, nextEntries, nextMeta);
      continue;
    }

    const target = existing!;
    const payload = payloadFromMarkdown(action.body);
    await updateEntry(target.id, payload);
    let updated: Entry = { ...target, content: payload.markdown, content_json: payload.json };
    updated = await applyVaultMetadata(updated, file.relativePath, file.tags, idByPath);
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

/**
 * Settle one conflict by declaring a winner.
 *
 * `"page"` rewrites the file from what Wings holds; `"file"` replaces the page
 * with what is on disk. Either way both sides end up recorded as agreeing, so
 * the conflict does not come back on the next sync.
 */
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
