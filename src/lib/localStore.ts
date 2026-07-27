// IndexedDB mirror of the workspace.
//
// Reads paint from here before Supabase answers, and writes land here before
// the network is attempted. Supabase stays authoritative: this store is a cache
// plus an outbox, never the last word on a conflict.
//
// Every operation degrades to a no-op when IndexedDB is unavailable (private
// windows, jsdom, storage denied) so no caller has to branch on support.

import Dexie, { type Table } from "dexie";
import type { JSONContent } from "@tiptap/core";
import type { Entry, ShareRole } from "./journal";

/** Cached server row, tagged with the account whose fetch produced it. */
export interface CachedEntry extends Entry {
  cacheOwnerId: string;
  cachedAt: number;
}

/**
 * Share state from the last server fetch. Cached because the editor cannot
 * learn it after mounting — switching TipTap into collaborative mode means
 * discarding the editor the user is typing in.
 */
export interface WorkspaceMetaRow {
  userId: string;
  roleMap: Record<string, ShareRole>;
  sharedEntryIds: string[];
  fetchedAt: number;
}

export interface DraftRow {
  entryId: string;
  markdown: string;
  json: JSONContent | null;
  updatedAt: number;
}

export interface PendingWriteRow {
  entryId: string;
  content: string;
  contentJson: JSONContent | null;
  timestamp: number;
}

export interface LinkIndexRow {
  entryId: string;
  /** Ids of pages this page links to. */
  outgoing: string[];
  /** Wikilink titles that don't resolve to an existing page yet. */
  unresolved: string[];
  updatedAt: number;
}

class WingsDatabase extends Dexie {
  entries!: Table<CachedEntry, string>;
  meta!: Table<WorkspaceMetaRow, string>;
  drafts!: Table<DraftRow, string>;
  pendingWrites!: Table<PendingWriteRow, string>;
  linkIndex!: Table<LinkIndexRow, string>;

  constructor() {
    super("wings");
    this.version(1).stores({
      entries: "id, cacheOwnerId",
      meta: "userId",
      drafts: "entryId",
      pendingWrites: "entryId",
      linkIndex: "entryId, *outgoing",
    });
  }
}

let database: WingsDatabase | null | undefined;

/** Null when IndexedDB is missing or refused to open. */
function db(): WingsDatabase | null {
  if (database !== undefined) return database;
  try {
    database = typeof indexedDB === "undefined" ? null : new WingsDatabase();
  } catch {
    database = null;
  }
  return database;
}

export function isLocalStoreAvailable(): boolean {
  return db() !== null;
}

/** Storage failures must never surface as app errors — the server still has the data. */
async function guard<T>(work: (instance: WingsDatabase) => Promise<T>, fallback: T): Promise<T> {
  const instance = db();
  if (!instance) return fallback;
  try {
    return await work(instance);
  } catch (err) {
    console.warn("[wings] local store unavailable", err);
    return fallback;
  }
}

function toCached(entry: Entry, cacheOwnerId: string): CachedEntry {
  return { ...entry, cacheOwnerId, cachedAt: Date.now() };
}

function toEntry({ cacheOwnerId: _owner, cachedAt: _at, ...entry }: CachedEntry): Entry {
  return entry;
}

/** Entries last mirrored for this account, newest first. */
export function readCachedEntries(userId: string): Promise<Entry[]> {
  return guard(async (instance) => {
    const rows = await instance.entries.where("cacheOwnerId").equals(userId).toArray();
    return rows
      .map(toEntry)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, []);
}

/**
 * Replace this account's cached rows with a fresh server fetch, dropping rows
 * that no longer exist so deletions from another device don't linger.
 */
export function replaceCachedEntries(userId: string, entries: Entry[]): Promise<void> {
  return guard(async (instance) => {
    const keep = new Set(entries.map((e) => e.id));
    await instance.transaction("rw", instance.entries, async () => {
      const stale = await instance.entries.where("cacheOwnerId").equals(userId).primaryKeys();
      await instance.entries.bulkDelete(stale.filter((id) => !keep.has(id)));
      await instance.entries.bulkPut(entries.map((e) => toCached(e, userId)));
    });
  }, undefined);
}

export function putCachedEntry(userId: string, entry: Entry): Promise<void> {
  return guard(async (instance) => {
    await instance.entries.put(toCached(entry, userId));
  }, undefined);
}

export function deleteCachedEntries(ids: string[]): Promise<void> {
  return guard(async (instance) => {
    await instance.entries.bulkDelete(ids);
  }, undefined);
}

export function readWorkspaceMeta(userId: string): Promise<WorkspaceMetaRow | null> {
  return guard(async (instance) => (await instance.meta.get(userId)) ?? null, null);
}

export function putWorkspaceMeta(row: WorkspaceMetaRow): Promise<void> {
  return guard(async (instance) => {
    await instance.meta.put(row);
  }, undefined);
}

export function readAllDrafts(): Promise<DraftRow[]> {
  return guard((instance) => instance.drafts.toArray(), []);
}

export function putDraftRow(row: DraftRow): Promise<void> {
  return guard(async (instance) => {
    await instance.drafts.put(row);
  }, undefined);
}

export function deleteDraftRow(entryId: string): Promise<void> {
  return guard(async (instance) => {
    await instance.drafts.delete(entryId);
  }, undefined);
}

export function readPendingWriteRows(): Promise<PendingWriteRow[]> {
  return guard((instance) => instance.pendingWrites.toArray(), []);
}

export function putPendingWriteRow(row: PendingWriteRow): Promise<void> {
  return guard(async (instance) => {
    await instance.pendingWrites.put(row);
  }, undefined);
}

export function deletePendingWriteRow(entryId: string): Promise<void> {
  return guard(async (instance) => {
    await instance.pendingWrites.delete(entryId);
  }, undefined);
}

export function readLinkIndex(): Promise<LinkIndexRow[]> {
  return guard((instance) => instance.linkIndex.toArray(), []);
}

export function putLinkIndexRow(row: LinkIndexRow): Promise<void> {
  return guard(async (instance) => {
    await instance.linkIndex.put(row);
  }, undefined);
}

export function deleteLinkIndexRow(entryId: string): Promise<void> {
  return guard(async (instance) => {
    await instance.linkIndex.delete(entryId);
  }, undefined);
}
