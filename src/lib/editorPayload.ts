import type { JSONContent } from "@tiptap/core";

/**
 * Serialized editor state passed from BlockEditor → save pipeline.
 *
 * `markdown` is only present on a full serialize. Rendering the whole document
 * to markdown is the dominant cost on the keystroke path, so while the user is
 * typing the editor emits JSON alone and the save pipeline asks for a full
 * serialize right before it persists.
 */
export interface EditorChangePayload {
  markdown?: string;
  json: JSONContent;
}

/** Both representations of the same document state — required to persist. */
export interface FullEditorChangePayload extends EditorChangePayload {
  markdown: string;
}

export function isFullPayload(
  payload: EditorChangePayload | null | undefined,
): payload is FullEditorChangePayload {
  return payload != null && typeof payload.markdown === "string";
}

/**
 * Ask the mounted BlockEditor to serialize `entryId` right now.
 *
 * Returns null when a different entry is mounted, so a save that was scheduled
 * before the user navigated can never write one page's text into another's row.
 */
export function requestEditorSerialize(entryId: string): FullEditorChangePayload | null {
  const serialize = (
    window as { __nw_flushEditor?: (id: string) => EditorChangePayload | null }
  ).__nw_flushEditor;
  const payload = serialize?.(entryId) ?? null;
  return isFullPayload(payload) ? payload : null;
}

export function emptyEditorPayload(): FullEditorChangePayload {
  return { markdown: "", json: { type: "doc", content: [] } };
}
