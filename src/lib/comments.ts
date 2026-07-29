import { supabase } from "@/integrations/supabase/client";
import { logError } from "./logger";

export interface EntryComment {
  id: string;
  entry_id: string;
  author_id: string;
  block_id: string | null;
  body: string;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export async function fetchEntryComments(entryId: string): Promise<EntryComment[]> {
  const { data, error } = await supabase
    .from("entry_comments")
    .select("id, entry_id, author_id, block_id, body, resolved_at, created_at, updated_at")
    .eq("entry_id", entryId)
    .order("created_at", { ascending: true });
  if (error) {
    logError("Failed to fetch comments", error);
    throw error;
  }
  return (data ?? []) as EntryComment[];
}

export async function createEntryComment(
  entryId: string,
  authorId: string,
  body: string,
  blockId?: string | null,
): Promise<EntryComment> {
  const trimmed = body.trim();
  if (!trimmed) throw new Error("Comment cannot be empty");
  const { data, error } = await supabase
    .from("entry_comments")
    .insert({
      entry_id: entryId,
      author_id: authorId,
      body: trimmed,
      block_id: blockId ?? null,
    })
    .select("id, entry_id, author_id, block_id, body, resolved_at, created_at, updated_at")
    .single();
  if (error) throw error;
  return data as EntryComment;
}

export async function resolveEntryComment(commentId: string): Promise<void> {
  const { error } = await supabase
    .from("entry_comments")
    .update({ resolved_at: new Date().toISOString() })
    .eq("id", commentId);
  if (error) throw error;
}

export async function deleteEntryComment(commentId: string): Promise<void> {
  const { error } = await supabase.from("entry_comments").delete().eq("id", commentId);
  if (error) throw error;
}
