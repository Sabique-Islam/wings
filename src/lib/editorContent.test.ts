import { describe, it, expect } from "vitest";
import { isEmptyDoc, resolveInitialEditorContent, shouldApplyDraft, shouldBlockEmptySave, shouldReplayPendingWrite } from "./editorContent";

describe("editorContent", () => {
  it("detects empty TipTap docs", () => {
    expect(isEmptyDoc(null)).toBe(true);
    expect(isEmptyDoc({ type: "doc", content: [] })).toBe(true);
    expect(isEmptyDoc({ type: "doc", content: [{ type: "paragraph" }] })).toBe(true);
    expect(
      isEmptyDoc({
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: "hi" }] }],
      }),
    ).toBe(false);
  });

  it("prefers markdown when content_json is an empty doc", () => {
    const resolved = resolveInitialEditorContent("hello world", { type: "doc", content: [] });
    expect(typeof resolved).toBe("string");
    expect(resolved).toContain("hello");
  });

  it("uses content_json when it has real nodes", () => {
    const json = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "from json" }] }],
    };
    expect(resolveInitialEditorContent("ignored markdown", json)).toEqual(json);
  });

  it("ignores empty local drafts over existing content", () => {
    expect(shouldApplyDraft("saved notes", "")).toBe(false);
    expect(shouldApplyDraft("", "")).toBe(true);
    expect(shouldApplyDraft("saved", "draft")).toBe(true);
  });

  it("applies JSON-only drafts, which is what the typing path writes", () => {
    const typed = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "unsaved edit" }] }],
    };
    expect(shouldApplyDraft("saved notes long enough to matter", "", typed)).toBe(true);
    expect(shouldApplyDraft("saved notes long enough to matter", "", { type: "doc", content: [] })).toBe(false);
    expect(shouldApplyDraft("saved notes long enough to matter", "", null)).toBe(false);
  });

  it("blocks empty autosave over substantial content", () => {
    expect(shouldBlockEmptySave("x".repeat(25), "")).toBe(true);
    expect(shouldBlockEmptySave("short", "")).toBe(false);
    expect(shouldBlockEmptySave("long content here", "still writing")).toBe(false);
  });

  it("blocks replaying empty pending writes over server content", () => {
    expect(shouldReplayPendingWrite("saved notes with enough text here", "")).toBe(false);
    expect(shouldReplayPendingWrite("", "")).toBe(true);
    expect(shouldReplayPendingWrite("saved", "offline edit")).toBe(true);
  });
});
