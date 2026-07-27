import { describe, it, expect, beforeEach, vi } from "vitest";
import { clearDraft, getDraft, saveDraft, saveDraftThrottled } from "./draftCache";
import { readAllDrafts } from "./localStore";

const doc = {
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text: "typed but not saved" }] }],
};

/** Draft persistence is fire-and-forget, so wait for it to land. */
async function waitForPersistedDraft(entryId: string): Promise<void> {
  for (let attempt = 0; attempt < 50; attempt++) {
    const rows = await readAllDrafts();
    if (rows.some((row) => row.entryId === entryId)) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(`draft for ${entryId} never reached IndexedDB`);
}

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

  it("restores a typing-path draft from IndexedDB after a reload", async () => {
    // The typing path deliberately skips the localStorage mirror, so this only
    // passes if IndexedDB is carrying the draft.
    saveDraftThrottled("entry-reload", { json: doc });
    await waitForPersistedDraft("entry-reload");
    localStorage.clear();

    vi.resetModules();
    const reloaded = await import("./draftCache");
    expect(reloaded.getDraft("entry-reload")).toBeNull();

    await reloaded.hydrateDraftCache();
    expect(reloaded.getDraft("entry-reload")).toEqual({ markdown: "", json: doc });

    reloaded.clearDraft("entry-reload");
  });

  it("migrates a draft left behind in localStorage by an older release", async () => {
    localStorage.setItem("nw_draft_entry-legacy", "written by the previous version");

    vi.resetModules();
    const reloaded = await import("./draftCache");
    await reloaded.hydrateDraftCache();

    expect(reloaded.getDraft("entry-legacy")).toEqual({
      markdown: "written by the previous version",
      json: null,
    });
    reloaded.clearDraft("entry-legacy");
  });
});
