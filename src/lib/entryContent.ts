// Builds a save payload for a page that is not open in the editor.
//
// `content` and `content_json` must stay semantically in sync on every save, and
// only one document can vouch for both. Parsing the markdown through the real
// editor schema produces that matching pair, so writes to a page the user isn't
// looking at are as safe as writes from the editor itself.

import { generateJSON } from "@tiptap/core";
import { markdownToHtml } from "./markdown";
import { createBlockEditorExtensions } from "@/components/BlockEditor/editorExtensions";
import type { FullEditorChangePayload } from "./editorPayload";

export function payloadFromMarkdown(markdown: string): FullEditorChangePayload {
  const trimmed = markdown.trim();
  if (!trimmed) return { markdown: "", json: { type: "doc", content: [] } };
  return {
    markdown: trimmed,
    json: generateJSON(markdownToHtml(trimmed), createBlockEditorExtensions()),
  };
}

/** Append blocks to a page's markdown, keeping one blank line between them. */
export function appendMarkdown(existing: string, addition: string): string {
  const base = existing.trimEnd();
  const extra = addition.trim();
  if (!extra) return base;
  return base ? `${base}\n\n${extra}` : extra;
}
