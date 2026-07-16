import type { JSONContent } from "@tiptap/core";

/** Serialized editor state passed from BlockEditor → save pipeline. */
export interface EditorChangePayload {
  markdown: string;
  json: JSONContent;
}

export function emptyEditorPayload(): EditorChangePayload {
  return { markdown: "", json: { type: "doc", content: [] } };
}
