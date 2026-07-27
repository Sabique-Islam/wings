import { supabase } from "@/integrations/supabase/client";
import type { JSONContent } from "@tiptap/core";
import { EntryLayoutMap, normalizeLayout } from "./layout";
import { logError } from "./logger";
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
  const unpinned = entries.filter((e) => !e.pinned);
  const sorted = [...unpinned].sort((a, b) => b.created_at.localeCompare(a.created_at));

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
  return entries.filter((e) => e.pinned).sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function getRootEntries(entries: Entry[]): Entry[] {
  return entries.filter((e) => !e.parent_id);
}

export function getChildEntries(entries: Entry[], parentId: string): Entry[] {
  return entries.filter((e) => e.parent_id === parentId).sort((a, b) => b.created_at.localeCompare(a.created_at));
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

const ENTRY_COLS = "id, content, content_json, created_at, user_id, pinned, parent_id, title, share_token, layout, deleted_at";

export interface FetchedEntries {
  entries: Entry[];
  roleMap: Record<string, ShareRole>;
  /** Entries with at least one share row — the pages that use realtime collab. */
  sharedEntryIds: Set<string>;
}

export async function fetchEntries(userId: string, opts: { includeTrash?: boolean } = {}): Promise<FetchedEntries> {
  // Fetch own entries
  let query = supabase
    .from("entries")
    .select(ENTRY_COLS)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (!opts.includeTrash) query = query.is("deleted_at", null);
  const { data: ownData, error: ownError } = await query;
  if (ownError) {
    logError("Failed to fetch own entries", ownError);
    throw ownError;
  }

  const roleMap: Record<string, ShareRole> = {};
  (ownData ?? []).forEach((e: any) => { roleMap[e.id] = "owner"; });

  // One pass over entry_shares (non-critical — don't break if it fails). RLS
  // returns shares on entries the user owns plus shares made to them, which is
  // exactly the set of pages that should open in collaborative mode.
  const sharedEntryIds = new Set<string>();
  let sharedEntries: any[] = [];
  try {
    const { data: shareRows } = await supabase
      .from("entry_shares")
      .select("entry_id, role, shared_with_user_id");

    (shareRows ?? []).forEach((s: any) => sharedEntryIds.add(s.entry_id));

    const sharedWithUser = (shareRows ?? []).filter((s: any) => s.shared_with_user_id === userId);
    if (sharedWithUser.length > 0) {
      sharedWithUser.forEach((s: any) => { roleMap[s.entry_id] = s.role as ShareRole; });
      const sharedIds = sharedWithUser.map((s: any) => s.entry_id);
      let sharedQuery = supabase
        .from("entries")
        .select(ENTRY_COLS)
        .in("id", sharedIds);
      if (!opts.includeTrash) sharedQuery = sharedQuery.is("deleted_at", null);
      const { data: entries } = await sharedQuery;
      if (entries) sharedEntries = entries as any[];
    }
  } catch (err) {
    logError("Failed to fetch shared entries", err);
  }

  const all = [...(ownData ?? []), ...sharedEntries];
  const seen = new Set<string>();
  const unique = all.filter((e) => {
    if (seen.has(e.id)) return false;
    seen.add(e.id);
    return true;
  });

  const mapped: Entry[] = unique.map((d: any) => ({
    ...d,
    content_json: (d.content_json as JSONContent | null) ?? null,
    parent_id: d.parent_id ?? null,
    title: d.title ?? "",
    share_token: d.share_token ?? null,
    layout: normalizeLayout(d.layout),
    deleted_at: d.deleted_at ?? null,
  }));

  return { entries: mapped, roleMap, sharedEntryIds };
}

export async function fetchTrash(userId: string): Promise<Entry[]> {
  const { data, error } = await supabase
    .from("entries")
    .select(ENTRY_COLS)
    .eq("user_id", userId)
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });
  if (error) { logError("Failed to fetch trash", error); return []; }
  return (data ?? []).map((d: any) => ({
    ...d,
    content_json: (d.content_json as JSONContent | null) ?? null,
    parent_id: d.parent_id ?? null,
    title: d.title ?? "",
    share_token: d.share_token ?? null,
    layout: normalizeLayout(d.layout),
    deleted_at: d.deleted_at ?? null,
  }));
}

export async function createEntry(userId: string, content: string, parentId?: string): Promise<Entry> {
  const insert = { user_id: userId, content, ...(parentId ? { parent_id: parentId } : {}) };
  const { data, error } = await supabase
    .from("entries")
    .insert(insert)
    .select(ENTRY_COLS)
    .single();
  if (error) throw error;
  if (!data) throw new Error("Failed to create page");
  return {
    ...data,
    content_json: (data.content_json as JSONContent | null) ?? null,
    parent_id: data.parent_id ?? null,
    title: data.title ?? "",
    share_token: data.share_token ?? null,
    layout: normalizeLayout(data.layout),
    deleted_at: data.deleted_at ?? null,
  };
}

export async function updateEntry(id: string, payload: FullEditorChangePayload): Promise<void> {
  const { error } = await supabase
    .from("entries")
    .update({ content: payload.markdown, content_json: payload.json })
    .eq("id", id);
  if (error) throw error;
}

/** True when an entry has at least one share row (enables realtime collab). */
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

export async function togglePin(id: string, pinned: boolean): Promise<void> {
  const { error } = await supabase
    .from("entries")
    .update({ pinned })
    .eq("id", id);
  if (error) throw error;
}

/** Soft-delete: move to trash (recoverable). Use permanentlyDeleteEntry to hard-delete. */
export async function deleteEntry(id: string): Promise<void> {
  const { error } = await supabase
    .from("entries")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function restoreEntry(id: string): Promise<void> {
  const { error } = await supabase
    .from("entries")
    .update({ deleted_at: null })
    .eq("id", id);
  if (error) throw error;
}

export async function permanentlyDeleteEntry(id: string): Promise<void> {
  const { error } = await supabase
    .from("entries")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

/** Full-text search over the current user's non-trashed entries. */
export async function searchEntries(userId: string, q: string, limit = 20): Promise<Entry[]> {
  const query = q.trim();
  if (!query) return [];
  const { data, error } = await supabase
    .from("entries")
    .select(ENTRY_COLS)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .textSearch("search_tsv", query, { type: "websearch", config: "english" })
    .limit(limit);
  if (error) { logError("Search failed", error); return []; }
  return (data ?? []).map((d: any) => ({
    ...d,
    content_json: (d.content_json as JSONContent | null) ?? null,
    parent_id: d.parent_id ?? null,
    title: d.title ?? "",
    share_token: d.share_token ?? null,
    layout: normalizeLayout(d.layout),
    deleted_at: d.deleted_at ?? null,
  }));
}
