import type { JSONContent } from "@tiptap/core";
import { supabase } from "@/integrations/supabase/client";
import { shouldBlockEmptySave } from "@/lib/editorContent";
import type { FullEditorChangePayload } from "@/lib/editorPayload";
import type { Entry } from "@/lib/journal";
import { updateEntry } from "@/lib/journal";
import { putCachedEntry, readCachedEntries } from "@/lib/localStore";
import { payloadFromMarkdown } from "@/lib/entryContent";
import { getVaultMeta } from "@/lib/vault/store";
import { scanVaultFolder } from "@/lib/vault/read";
import { mirrorEntryToVault } from "@/lib/vault/write";
import { ensureVaultPermission } from "@/lib/vault/store";
import type { TablesUpdate } from "@/integrations/supabase/types";

export type ContentStorage = "cloud" | "local";
export type DefaultContentStorage = "cloud" | "local" | "ask";

export function normalizeContentStorage(value: unknown): ContentStorage {
  return value === "local" ? "local" : "cloud";
}

export function isLocalEntry(entry: Pick<Entry, "content_storage">): boolean {
  return entry.content_storage === "local";
}

export function isCloudEntry(entry: Pick<Entry, "content_storage">): boolean {
  return !isLocalEntry(entry);
}

/** Real markdown for data-safety guards — not the empty server stub on local rows. */
export function getCanonicalContent(entry: Pick<Entry, "content" | "content_storage">): string {
  return entry.content ?? "";
}

function hasLocalBody(entry: Pick<Entry, "content" | "content_json">): boolean {
  if (entry.content.trim().length > 0) return true;
  const json = entry.content_json;
  if (!json || json.type !== "doc") return false;
  const nodes = json.content;
  if (!nodes?.length) return false;
  if (nodes.length === 1 && nodes[0].type === "paragraph") {
    const inner = nodes[0].content;
    return Boolean(inner?.length);
  }
  return true;
}

function mergeLocalBody(serverRow: Entry, cached: Entry | undefined): Entry {
  if (!isLocalEntry(serverRow)) return serverRow;
  if (hasLocalBody(serverRow)) return serverRow;
  if (cached && (hasLocalBody(cached) || cached.content_storage === "local")) {
    return {
      ...serverRow,
      content: cached.content,
      content_json: cached.content_json,
    };
  }
  return serverRow;
}

async function bodyFromVault(userId: string, entryId: string): Promise<Pick<Entry, "content" | "content_json"> | null> {
  const meta = await getVaultMeta(userId);
  if (!meta?.handle) return null;
  if (!(await ensureVaultPermission(meta))) return null;
  const files = await scanVaultFolder(meta.handle);
  const match = files.find((f) => f.wingsId === entryId);
  if (!match) return null;
  const payload = payloadFromMarkdown(match.content);
  return { content: payload.markdown, content_json: payload.json };
}

/** Merge IndexedDB (and vault file) bodies into local rows from a server fetch. */
export async function hydrateLocalEntries(userId: string, rows: Entry[]): Promise<Entry[]> {
  const cached = await readCachedEntries(userId);
  const byId = new Map(cached.map((e) => [e.id, e]));
  const out: Entry[] = [];

  for (const row of rows) {
    if (!isLocalEntry(row)) {
      out.push(row);
      continue;
    }
    let merged = mergeLocalBody(row, byId.get(row.id));
    if (!hasLocalBody(merged)) {
      const fromVault = await bodyFromVault(userId, row.id);
      if (fromVault) {
        merged = { ...merged, ...fromVault };
      }
    }
    out.push(merged);
  }

  return out;
}

export type EntryMetadataPatch = Partial<
  Pick<Entry, "title" | "pinned" | "parent_id" | "layout" | "deleted_at">
>;

/** Metadata-only Supabase update — never sends body columns. */
export async function updateEntryMetadata(id: string, patch: EntryMetadataPatch): Promise<void> {
  const allowed: TablesUpdate<"entries"> = {};
  if (patch.title !== undefined) allowed.title = patch.title.slice(0, 100);
  if (patch.pinned !== undefined) allowed.pinned = patch.pinned;
  if (patch.parent_id !== undefined) allowed.parent_id = patch.parent_id;
  if (patch.layout !== undefined) {
    allowed.layout = patch.layout as unknown as TablesUpdate<"entries">["layout"];
  }
  if (patch.deleted_at !== undefined) allowed.deleted_at = patch.deleted_at;
  if (Object.keys(allowed).length === 0) return;
  const { error } = await supabase.from("entries").update(allowed).eq("id", id);
  if (error) throw error;
}

export async function saveLocalContent(
  userId: string,
  entry: Entry,
  allEntries: Entry[],
  payload: FullEditorChangePayload,
): Promise<void> {
  if (!isLocalEntry(entry)) {
    if (import.meta.env.DEV) {
      throw new Error("[wings] saveLocalContent called on a cloud entry");
    }
    console.warn("[wings] saveLocalContent skipped — entry is not local", entry.id);
    return;
  }
  const updated: Entry = {
    ...entry,
    content: payload.markdown,
    content_json: payload.json,
  };
  await putCachedEntry(userId, updated);
  await mirrorEntryToVault(userId, updated, allEntries);
}

export async function saveCloudContent(id: string, payload: FullEditorChangePayload): Promise<void> {
  await updateEntry(id, payload);
}

/** Route a body save to local or cloud storage. */
export async function persistEntryBody(
  userId: string,
  entry: Entry,
  allEntries: Entry[],
  payload: FullEditorChangePayload,
): Promise<void> {
  if (isLocalEntry(entry)) {
    await saveLocalContent(userId, entry, allEntries, payload);
  } else {
    await saveCloudContent(entry.id, payload);
  }
}

/** One-way local → cloud: upload body and flip storage flag. */
export async function promoteEntryToCloud(
  userId: string,
  entry: Entry,
  payload: FullEditorChangePayload,
): Promise<Entry> {
  if (!isLocalEntry(entry)) {
    throw new Error("Page is already stored in the cloud");
  }
  if (shouldBlockEmptySave(getCanonicalContent(entry), payload.markdown)) {
    throw new Error("Cannot move an empty page to the cloud");
  }
  const { error } = await supabase
    .from("entries")
    .update({
      content: payload.markdown,
      content_json: payload.json as never,
      content_storage: "cloud",
    })
    .eq("id", entry.id);
  if (error) throw error;

  const promoted: Entry = {
    ...entry,
    content: payload.markdown,
    content_json: payload.json,
    content_storage: "cloud",
  };
  await putCachedEntry(userId, promoted);
  return promoted;
}

export function entryWithHydratedContent(entry: Entry, content: string, json: JSONContent | null): Entry {
  return { ...entry, content, content_json: json };
}
