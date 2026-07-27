import { describe, it, expect, beforeEach } from "vitest";
import { clearDraft, getDraft, saveDraft } from "./draftCache";

const doc = {
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text: "typed but not saved" }] }],
};

describe("draftCache", () => {
  beforeEach(() => {
    clearDraft("entry-1");
  });

  it("keeps the last markdown when the typing path writes JSON alone", () => {
    saveDraft("entry-1", { markdown: "first version", json: { type: "doc", content: [] } });
    saveDraft("entry-1", { json: doc });

    expect(getDraft("entry-1")).toEqual({ markdown: "first version", json: doc });
  });

  it("returns a draft that only ever had JSON written to it", () => {
    saveDraft("entry-1", { json: doc });

    expect(getDraft("entry-1")).toEqual({ markdown: "", json: doc });
  });

  it("has no draft until something is written", () => {
    expect(getDraft("entry-1")).toBeNull();
  });
});
