import type { JSONContent } from "@tiptap/core";
import { markdownToHtml } from "@/lib/markdown";

/** True when TipTap JSON is an empty doc (or a single empty paragraph). */
export function isEmptyDoc(json: JSONContent | null | undefined): boolean {
  if (!json || json.type !== "doc") return true;
  const nodes = json.content;
  if (!nodes?.length) return true;
  if (nodes.length === 1 && nodes[0].type === "paragraph") {
    const inner = nodes[0].content;
    return !inner?.length;
  }
  return false;
}

/** Prefer real markdown over an empty content_json snapshot (regression guard). */
export function resolveInitialEditorContent(
  content: string,
  contentJson?: JSONContent | null,
  resolvePageId?: (title: string) => string | null,
): string | JSONContent {
  const markdown = content ?? "";
  const hasMarkdown = markdown.trim().length > 0;

  if (contentJson && typeof contentJson === "object" && contentJson.type === "doc" && !isEmptyDoc(contentJson)) {
    return contentJson;
  }

  if (hasMarkdown) {
    return markdownToHtml(markdown, resolvePageId);
  }

  if (contentJson && contentJson.type === "doc") {
    return contentJson;
  }

  return markdownToHtml(markdown, resolvePageId);
}

/**
 * Ignore local drafts that would wipe existing server content.
 *
 * A draft with no markdown can still hold real work — the editor writes
 * JSON-only drafts while the user is typing — so the JSON decides in that case.
 */
export function shouldApplyDraft(
  existingContent: string,
  draftMarkdown: string,
  draftJson?: JSONContent | null,
): boolean {
  if (draftMarkdown.trim().length > 0) return true;
  if (!isEmptyDoc(draftJson)) return true;
  return existingContent.trim().length === 0;
}

/** Block autosave that would replace substantial content with an empty doc. */
export function shouldBlockEmptySave(existingContent: string, nextMarkdown: string): boolean {
  const had = existingContent.trim().length;
  const next = nextMarkdown.trim().length;
  return had >= 20 && next === 0;
}

/** Block offline pending-write replay that would wipe server content. */
export function shouldReplayPendingWrite(serverContent: string, pendingMarkdown: string): boolean {
  return !shouldBlockEmptySave(serverContent, pendingMarkdown);
}

export interface DraftOverlay {
  markdown: string;
  json?: JSONContent | null;
}

/**
 * Merge a local draft into a server/cached entry when the draft is allowed to win.
 * Used after fetch and on cold start so fresher local work is not wiped.
 */
export function applyDraftToEntry<T extends { content: string; content_json?: JSONContent | null }>(
  entry: T,
  draft: DraftOverlay | null | undefined,
): T {
  if (draft == null) return entry;
  if (!shouldApplyDraft(entry.content, draft.markdown, draft.json)) return entry;
  if (entry.content === draft.markdown && entry.content_json === draft.json) return entry;
  // A JSON-only draft has no markdown to restore — keep the server copy so
  // the empty-save guard still measures against the real content length.
  const content = draft.markdown.trim().length > 0 ? draft.markdown : entry.content;
  return { ...entry, content, content_json: draft.json ?? entry.content_json };
}

function jsonSnapshot(json: JSONContent | null | undefined): string {
  return JSON.stringify(json ?? null);
}

/** True when incoming props carry a non-empty JSON doc that differs from what the editor last emitted. */
export function shouldSyncEditorFromProps(
  content: string,
  contentJson: JSONContent | null | undefined,
  lastEmittedMarkdown: string,
  lastEmittedJson: JSONContent | null,
): boolean {
  if (content !== lastEmittedMarkdown) return true;
  if (isEmptyDoc(contentJson)) return false;
  return jsonSnapshot(contentJson) !== jsonSnapshot(lastEmittedJson);
}
