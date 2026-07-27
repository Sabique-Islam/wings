import { describe, it, expect, beforeEach } from "vitest";
import type { Entry } from "./journal";
import {
  isLocalStoreAvailable,
  putCachedEntry,
  putWorkspaceMeta,
  readCachedEntries,
  readWorkspaceMeta,
  replaceCachedEntries,
} from "./localStore";

function entry(id: string, overrides: Partial<Entry> = {}): Entry {
  return {
    id,
    content: `content of ${id}`,
    content_json: null,
    created_at: `2026-01-0${id.slice(-1)}T00:00:00.000Z`,
    user_id: "user-a",
    pinned: false,
    parent_id: null,
    title: id,
    share_token: null,
    layout: {},
    deleted_at: null,
    ...overrides,
  };
}

describe("localStore", () => {
  beforeEach(async () => {
    await replaceCachedEntries("user-a", []);
    await replaceCachedEntries("user-b", []);
  });

  it("is backed by a real IndexedDB in tests", () => {
    expect(isLocalStoreAvailable()).toBe(true);
  });

  it("reads back cached entries newest first", async () => {
    await replaceCachedEntries("user-a", [entry("page-1"), entry("page-3"), entry("page-2")]);

    const cached = await readCachedEntries("user-a");

    expect(cached.map((e) => e.id)).toEqual(["page-3", "page-2", "page-1"]);
    expect(cached[0].content).toBe("content of page-3");
  });

  it("keeps each account's mirror separate", async () => {
    await replaceCachedEntries("user-a", [entry("page-1")]);
    await replaceCachedEntries("user-b", [entry("page-2", { user_id: "user-b" })]);

    expect((await readCachedEntries("user-a")).map((e) => e.id)).toEqual(["page-1"]);
    expect((await readCachedEntries("user-b")).map((e) => e.id)).toEqual(["page-2"]);
  });

  it("drops pages the server no longer returns", async () => {
    await replaceCachedEntries("user-a", [entry("page-1"), entry("page-2")]);
    await replaceCachedEntries("user-a", [entry("page-2")]);

    expect((await readCachedEntries("user-a")).map((e) => e.id)).toEqual(["page-2"]);
  });

  it("overwrites a single page without touching the rest", async () => {
    await replaceCachedEntries("user-a", [entry("page-1"), entry("page-2")]);
    await putCachedEntry("user-a", entry("page-1", { content: "edited while offline" }));

    const cached = await readCachedEntries("user-a");
    expect(cached.find((e) => e.id === "page-1")?.content).toBe("edited while offline");
    expect(cached.find((e) => e.id === "page-2")?.content).toBe("content of page-2");
  });

  it("does not leak internal cache columns back to callers", async () => {
    await replaceCachedEntries("user-a", [entry("page-1")]);

    const [cached] = await readCachedEntries("user-a");
    expect(cached).not.toHaveProperty("cacheOwnerId");
    expect(cached).not.toHaveProperty("cachedAt");
  });

  it("round-trips share state so collab is known before the editor mounts", async () => {
    await putWorkspaceMeta({
      userId: "user-a",
      roleMap: { "page-1": "owner", "page-9": "viewer" },
      sharedEntryIds: ["page-9"],
      fetchedAt: 1,
    });

    const meta = await readWorkspaceMeta("user-a");
    expect(meta?.sharedEntryIds).toEqual(["page-9"]);
    expect(meta?.roleMap["page-9"]).toBe("viewer");
    expect(await readWorkspaceMeta("user-b")).toBeNull();
  });
});
