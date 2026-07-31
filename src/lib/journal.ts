import { supabase } from "@/integrations/supabase/client";
import type { JSONContent } from "@tiptap/core";
import { EntryLayoutMap, normalizeLayout } from "./layout";
import { logError } from "./logger";
import { sortSiblings } from "./pageOrder";
import type { FullEditorChangePayload } from "./editorPayload";

export interface Entry {
  id: string;
  content: string;
  content_json: JSONContent | null;
  created_at: string;
  user_id: string;
  pinned: boolean;
  parent_id: string | null;
  title: string;
  share_token: string | null;
  layout: EntryLayoutMap;
  /** Client-side sidebar order; persisted only when the DB column exists. */
  sort_order: number | null;
  deleted_at: string | null;
}

export type ShareRole = "owner" | "admin" | "editor" | "viewer";

export interface MonthGroup {
  key: string;
  label: string;
  entries: Entry[];
}

export function groupByMonth(entries: Entry[]): MonthGroup[] {
  const map = new Map<string, Entry[]>();
  const sorted = sortSiblings(entries.filter((e) => !e.pinned));

  for (const e of sorted) {
    const d = new Date(e.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(e);
  }

  return Array.from(map.entries()).map(([key, entries]) => {
    const [y, m] = key.split("-");
    const label = new Date(+y, +m - 1).toLocaleString("default", { month: "long", year: "numeric" });
    return { key, label, entries };
  });
}

export function getPinnedEntries(entries: Entry[]): Entry[] {
  return sortSiblings(entries.filter((e) => e.pinned));
}

export function getRootEntries(entries: Entry[]): Entry[] {
  return entries.filter((e) => !e.parent_id);
}

export function getChildEntries(entries: Entry[], parentId: string): Entry[] {
  return sortSiblings(entries.filter((e) => e.parent_id === parentId));
}

export function getBreadcrumbTrail(entries: Entry[], entryId: string): Entry[] {
  const trail: Entry[] = [];
  let current = entries.find((e) => e.id === entryId);
  while (current) {
    trail.unshift(current);
    current = current.parent_id ? entries.find((e) => e.id === current!.parent_id) : undefined;
  }
  return trail;
}

export function getEntryTitle(entry: Entry): string {
  return entry.title || entry.content.split("\n")[0].replace(/^#+\s*/, "").slice(0, 40) || "Untitled";
}

/** Columns for entries the caller owns (includes share_token for ShareMenu / public link). */
const ENTRY_COLS_OWNER =
  "id, content, content_json, created_at, user_id, pinned, parent_id, title, share_token, layout, deleted_at";

/** Columns for entries shared with the caller — never include share_token. */
const ENTRY_COLS_SHARED =
  "id, content, content_json, created_at, user_id, pinned, parent_id, title, layout, deleted_at, properties, sort_order";

async function fetchCollaboratorEntries(
  sharedIds: string[],
  includeTrash: boolean,
): Promise<Record<string, unknown>[]> {
  const { data, error } = await supabase.rpc("fetch_collaborator_entries", {
    _ids: sharedIds,
    _include_deleted: includeTrash,
  });
  if (!error) return (data ?? []) as Record<string, unknown>[];

  const rpcMissing =
    error.code === "PGRST202" ||
    (error.message?.includes("fetch_collaborator_entries") ?? false);
  if (!rpcMissing) {
    logError("Failed to fetch collaborator entries", error);
    return [];
  }

  let sharedQuery = supabase.from("entries").select(ENTRY_COLS_SHARED).in("id", sharedIds);
  if (!includeTrash) sharedQuery = sharedQuery.is("deleted_at", null);
  const { data: legacy, error: legacyError } = await sharedQuery;
  if (legacyError) {
    logError("Failed to fetch collaborator entries (legacy)", legacyError);
    return [];
  }
  return (legacy ?? []) as Record<string, unknown>[];
}

interface ShareBootstrapRow {
  entry_id: string;
  role: string;
  shared_with_user_id: string | null;
}

async function fetchShareBootstrapRows(userId: string): Promise<ShareBootstrapRow[]> {
  const { data, error } = await supabase.rpc("list_my_shares");
  if (!error) return (data ?? []) as ShareBootstrapRow[];

  const rpcMissing =
    error.code === "PGRST202" || (error.message?.includes("list_my_shares") ?? false);
  if (!rpcMissing) {
    logError("Failed to fetch share bootstrap rows", error);
    return [];
  }

  const { data: legacy, error: legacyError } = await supabase
    .from("entry_shares")
    .select("entry_id, role, shared_with_user_id");
  if (legacyError) {
    logError("Failed to fetch share bootstrap rows (legacy)", legacyError);
    return [];
  }
  return (legacy ?? []) as ShareBootstrapRow[];
}

function mapEntryRow(d: Record<string, unknown>): Entry {
  return {
    id: String(d.id),
    content: String(d.content ?? ""),
    content_json: (d.content_json as JSONContent | null) ?? null,
    created_at: String(d.created_at),
    user_id: String(d.user_id),
    pinned: Boolean(d.pinned),
    parent_id: (d.parent_id as string | null) ?? null,
    title: String(d.title ?? ""),
    share_token: (d.share_token as string | null) ?? null,
    layout: normalizeLayout(d.layout),
    sort_order: null,
    deleted_at: (d.deleted_at as string | null) ?? null,
  };
}

export interface FetchedEntries {
  entries: Entry[];
  roleMap: Record<string, ShareRole>;
  /** Entries with at least one share row — the pages that use realtime collab. */
  sharedEntryIds: Set<string>;
}

export interface FetchEntriesOptions {
  includeTrash?: boolean;
  /** When false, only owned pages are fetched (shared/collab state stays client-side). */
  includeShares?: boolean;
}

export interface WorkspaceMetaSnapshot {
  sharedEntryIds: string[];
  roleMap: Record<string, ShareRole>;
}

/** True when cached share state suggests the account may have collaborators. */
export function workspaceNeedsShareBootstrap(meta: WorkspaceMetaSnapshot | null): boolean {
  if (!meta) return true;
  if (meta.sharedEntryIds.length > 0) return true;
  return Object.values(meta.roleMap).some((role) => role !== "owner");
}

function ownerRoleMap(ownEntries: Entry[]): Record<string, ShareRole> {
  const roleMap: Record<string, ShareRole> = {};
  ownEntries.forEach((e) => {
    roleMap[e.id] = "owner";
  });
  return roleMap;
}

/** Replace owned pages from a server fetch while keeping collaborator pages from cache. */
export function mergeOwnEntriesWithShared(
  previous: Entry[],
  ownEntries: Entry[],
  userId: string,
): Entry[] {
  const shared = previous.filter((e) => e.user_id !== userId);
  const seen = new Set<string>();
  const merged: Entry[] = [];
  for (const entry of [...ownEntries, ...shared]) {
    if (seen.has(entry.id)) continue;
    seen.add(entry.id);
    merged.push(entry);
  }
  return merged;
}

export async function fetchOwnEntries(
  userId: string,
  opts: { includeTrash?: boolean } = {},
): Promise<Entry[]> {
  let query = supabase
    .from("entries")
    .select(ENTRY_COLS_OWNER)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (!opts.includeTrash) query = query.is("deleted_at", null);
  const { data, error } = await query;
  if (error) {
    logError("Failed to fetch own entries", error);
    throw error;
  }
  return (data ?? []).map((d) => mapEntryRow(d as Record<string, unknown>));
}

async function fetchShareWorkspace(
  userId: string,
  opts: { includeTrash?: boolean },
): Promise<Pick<FetchedEntries, "entries" | "roleMap" | "sharedEntryIds">> {
  const roleMap: Record<string, ShareRole> = {};
  const sharedEntryIds = new Set<string>();
  let sharedEntries: Record<string, unknown>[] = [];

  const shareRows = await fetchShareBootstrapRows(userId);
  shareRows.forEach((s) => sharedEntryIds.add(s.entry_id));

  const sharedWithUser = shareRows.filter((s) => s.shared_with_user_id === userId);
  if (sharedWithUser.length > 0) {
    sharedWithUser.forEach((s) => {
      roleMap[s.entry_id] = s.role as ShareRole;
    });
    const sharedIds = sharedWithUser.map((s) => s.entry_id);
    sharedEntries = await fetchCollaboratorEntries(sharedIds, !!opts.includeTrash);
  }

  return {
    entries: sharedEntries.map((d) => mapEntryRow(d as Record<string, unknown>)),
    roleMap,
    sharedEntryIds,
  };
}

function mergeFetchedEntries(ownEntries: Entry[], share: Pick<FetchedEntries, "entries" | "roleMap" | "sharedEntryIds">): FetchedEntries {
  const roleMap = { ...ownerRoleMap(ownEntries), ...share.roleMap };
  const seen = new Set<string>();
  const entries: Entry[] = [];
  for (const entry of [...ownEntries, ...share.entries]) {
    if (seen.has(entry.id)) continue;
    seen.add(entry.id);
    entries.push(entry);
  }
  return { entries, roleMap, sharedEntryIds: share.sharedEntryIds };
}

/** Full workspace fetch — own pages plus share bootstrap (sidebar, collab flags). */
export async function fetchEntries(userId: string, opts: FetchEntriesOptions = {}): Promise<FetchedEntries> {
  const includeShares = opts.includeShares ?? true;
  const ownEntries = await fetchOwnEntries(userId, opts);
  if (!includeShares) {
    return {
      entries: ownEntries,
      roleMap: ownerRoleMap(ownEntries),
      sharedEntryIds: new Set<string>(),
    };
  }

  try {
    const share = await fetchShareWorkspace(userId, opts);
    return mergeFetchedEntries(ownEntries, share);
  } catch (err) {
    logError("Failed to fetch shared entries", err);
    return {
      entries: ownEntries,
      roleMap: ownerRoleMap(ownEntries),
      sharedEntryIds: new Set<string>(),
    };
  }
}

/**
 * Cache-first reconcile: own pages from the server; share bootstrap only when
 * cached meta says this account may have collaborators (Notion-style — no
 * workspace-wide share scan on every session tick).
 */
export async function syncWorkspaceEntries(
  userId: string,
  meta: WorkspaceMetaSnapshot | null,
  previousEntries: Entry[],
  opts: { includeTrash?: boolean; refreshShares?: boolean } = {},
): Promise<FetchedEntries> {
  const ownEntries = await fetchOwnEntries(userId, opts);
  const needsShares = opts.refreshShares || workspaceNeedsShareBootstrap(meta);

  if (!needsShares) {
    const roleMap = ownerRoleMap(ownEntries);
    if (meta) {
      for (const [id, role] of Object.entries(meta.roleMap)) {
        if (role !== "owner") roleMap[id] = role;
      }
    }
    return {
      entries: mergeOwnEntriesWithShared(previousEntries, ownEntries, userId),
      roleMap,
      sharedEntryIds: new Set(meta?.sharedEntryIds ?? []),
    };
  }

  try {
    const share = await fetchShareWorkspace(userId, opts);
    return mergeFetchedEntries(ownEntries, share);
  } catch (err) {
    logError("Failed to fetch shared entries", err);
    return {
      entries: mergeOwnEntriesWithShared(previousEntries, ownEntries, userId),
      roleMap: ownerRoleMap(ownEntries),
      sharedEntryIds: new Set(meta?.sharedEntryIds ?? []),
    };
  }
}

export async function fetchTrash(userId: string): Promise<Entry[]> {
  const { data, error } = await supabase
    .from("entries")
    .select(ENTRY_COLS_OWNER)
    .eq("user_id", userId)
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });
  if (error) {
    logError("Failed to fetch trash", error);
    return [];
  }
  return (data ?? []).map((d) => mapEntryRow(d as Record<string, unknown>));
}

export async function createEntry(userId: string, content: string, parentId?: string): Promise<Entry> {
  const insert = { user_id: userId, content, ...(parentId ? { parent_id: parentId } : {}) };
  const { data, error } = await supabase.from("entries").insert(insert).select(ENTRY_COLS_OWNER).single();
  if (error) throw error;
  if (!data) throw new Error("Failed to create page");
  return mapEntryRow(data as Record<string, unknown>);
}

export async function updateEntry(id: string, payload: FullEditorChangePayload): Promise<void> {
  const { error } = await supabase
    .from("entries")
    .update({ content: payload.markdown, content_json: payload.json })
    .eq("id", id);
  if (error) throw error;
}

export async function entryHasShares(entryId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from("entry_shares")
    .select("id", { count: "exact", head: true })
    .eq("entry_id", entryId);
  if (error) return false;
  return (count ?? 0) > 0;
}

export async function updateEntryTitle(id: string, title: string): Promise<void> {
  const { error } = await supabase
    .from("entries")
    .update({ title: title.slice(0, 100) })
    .eq("id", id);
  if (error) throw error;
}

/** No-op until `sort_order` migration is applied in Supabase. */
export async function saveEntryOrder(_order: Array<{ id: string; sort_order: number }>): Promise<void> {
  return;
}

export async function moveEntry(id: string, parentId: string | null): Promise<void> {
  const { error } = await supabase.from("entries").update({ parent_id: parentId }).eq("id", id);
  if (error) throw error;
}

export async function togglePin(id: string, pinned: boolean): Promise<void> {
  const { error } = await supabase.from("entries").update({ pinned }).eq("id", id);
  if (error) throw error;
}

export async function deleteEntry(id: string): Promise<void> {
  const { error } = await supabase
    .from("entries")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function restoreEntry(id: string): Promise<void> {
  const { error } = await supabase.from("entries").update({ deleted_at: null }).eq("id", id);
  if (error) throw error;
}

export async function permanentlyDeleteEntry(id: string): Promise<void> {
  const { error } = await supabase.from("entries").delete().eq("id", id);
  if (error) throw error;
}

export async function searchEntries(userId: string, q: string, limit = 20): Promise<Entry[]> {
  const query = q.trim();
  if (!query) return [];
  const { data, error } = await supabase
    .from("entries")
    .select(ENTRY_COLS_OWNER)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .textSearch("search_tsv", query, { type: "websearch", config: "english" })
    .limit(limit);
  if (error) {
    logError("Search failed", error);
    return [];
  }
  return (data ?? []).map((d) => mapEntryRow(d as Record<string, unknown>));
}
