// The editor only renders markdown at flush points, so the save pipeline asks
// the mounted editor for a full payload right before it writes. These tests
// pin the two properties that keeps safe: a save never writes without markdown,
// and it never picks up a different page's document.

import { describe, it, expect, afterEach } from "vitest";
import { isFullPayload, requestEditorSerialize, type EditorChangePayload } from "./editorPayload";

type EditorWindow = Window & { __nw_flushEditor?: (id: string) => EditorChangePayload | null };

const doc = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "hi" }] }] };

function mountEditor(entryId: string, markdown: string) {
  (window as EditorWindow).__nw_flushEditor = (id) =>
    id === entryId ? { markdown, json: doc } : null;
}

afterEach(() => {
  delete (window as EditorWindow).__nw_flushEditor;
});

describe("editorPayload", () => {
  it("treats a payload as full only once it carries markdown", () => {
    expect(isFullPayload({ json: doc })).toBe(false);
    expect(isFullPayload({ markdown: "", json: doc })).toBe(true);
    expect(isFullPayload(null)).toBe(false);
  });

  it("serializes the entry the editor currently holds", () => {
    mountEditor("entry-1", "hi");
    expect(requestEditorSerialize("entry-1")).toEqual({ markdown: "hi", json: doc });
  });

  it("refuses to serialize once the user has moved to another entry", () => {
    mountEditor("entry-2", "text belonging to entry-2");
    expect(requestEditorSerialize("entry-1")).toBeNull();
  });

  it("returns null when no editor is mounted", () => {
    expect(requestEditorSerialize("entry-1")).toBeNull();
  });
});
