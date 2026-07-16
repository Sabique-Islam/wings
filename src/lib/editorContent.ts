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
): string | JSONContent {
  const markdown = content ?? "";
  const hasMarkdown = markdown.trim().length > 0;

  if (contentJson && typeof contentJson === "object" && contentJson.type === "doc" && !isEmptyDoc(contentJson)) {
    return contentJson;
  }

  if (hasMarkdown) {
    return markdownToHtml(markdown);
  }

  if (contentJson && contentJson.type === "doc") {
    return contentJson;
  }

  return markdownToHtml(markdown);
}

/** Ignore local drafts that would wipe existing server content. */
export function shouldApplyDraft(existingContent: string, draftMarkdown: string): boolean {
  if (draftMarkdown.trim().length > 0) return true;
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
