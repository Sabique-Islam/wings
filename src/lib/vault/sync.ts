import { createEntry, getEntryTitle, updateEntry, type Entry } from "@/lib/journal";
import { payloadFromMarkdown } from "@/lib/entryContent";
import { shouldBlockEmptySave } from "@/lib/editorContent";
import { contentHash, normalizeVaultContent, type VaultConflict, type VaultSyncResult } from "./types";
import { entryToRelativePath, parentPathForFile } from "./frontmatter";
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
      const parentPath = parentPathForFile(file.relativePath);
      const created = await createEntry(userId, action.body, parentPath ? idByPath.get(parentPath) : undefined);
      nextEntries = [created, ...nextEntries];
      byId.set(created.id, created);
      idByPath.set(file.relativePath, created.id);
      result.created += 1;
      // Stamp the new page's id into the file so the next sync recognises it.
      nextMeta = await writeEntryToVault(handle, created, nextEntries, nextMeta);
      continue;
    }

    const target = existing!;
    const payload = payloadFromMarkdown(action.body);
    await updateEntry(target.id, payload);
    const updated: Entry = { ...target, content: payload.markdown, content_json: payload.json };
    nextEntries = nextEntries.map((e) => (e.id === updated.id ? updated : e));
    byId.set(updated.id, updated);
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
