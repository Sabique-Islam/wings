// Version history for entries. Autosave fires every 1.5s, so the interesting
// part here is the policy that decides which of those saves is worth keeping:
// identical or rapid-fire saves are skipped so history stays readable and the
// table stays small.

import type { JSONContent } from "@tiptap/core";
import { supabase } from "@/integrations/supabase/client";

export interface EntryVersion {
  id: string;
  created_at: string;
  author_id: string | null;
}

export interface VersionSnapshot {
  content: string;
  content_json: JSONContent | null;
}

/** What we last kept for an entry, so we can tell "changed" from "resaved". */
export interface SnapshotMarker {
  content: string;
  at: number;
}

const MIN_SNAPSHOT_GAP_MS = 2 * 60 * 1000;

export function shouldSnapshot(
  previous: SnapshotMarker | null,
  markdown: string,
  now: number,
): boolean {
  if (markdown.trim().length === 0) return false;
  if (!previous) return true;
  if (previous.content === markdown) return false;
  return now - previous.at >= MIN_SNAPSHOT_GAP_MS;
}

const markers = new Map<string, SnapshotMarker>();

/** Records a snapshot if the policy says this save is worth keeping. */
export async function recordEntryVersion(
  entryId: string,
  authorId: string | null,
  snapshot: VersionSnapshot,
  now = Date.now(),
): Promise<boolean> {
  if (!shouldSnapshot(markers.get(entryId) ?? null, snapshot.content, now)) return false;

  const { error } = await supabase.from("entry_versions").insert({
    entry_id: entryId,
    author_id: authorId,
    content: snapshot.content,
    content_json: snapshot.content_json as never,
  });
  if (error) {
    console.warn("[wings] version snapshot failed", error.message);
    return false;
  }
  markers.set(entryId, { content: snapshot.content, at: now });
  return true;
}

export function forgetVersionMarker(entryId: string): void {
  markers.delete(entryId);
}

/** Newest first. Content is fetched separately so the list stays cheap. */
export async function listEntryVersions(entryId: string, limit = 25): Promise<EntryVersion[]> {
  const { data, error } = await supabase
    .from("entry_versions")
    .select("id, created_at, author_id")
    .eq("entry_id", entryId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function getEntryVersion(versionId: string): Promise<VersionSnapshot | null> {
  const { data, error } = await supabase
    .from("entry_versions")
    .select("content, content_json")
    .eq("id", versionId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    content: data.content ?? "",
    content_json: (data.content_json as JSONContent | null) ?? null,
  };
}
