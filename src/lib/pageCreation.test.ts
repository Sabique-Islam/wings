import { describe, expect, it } from "vitest";
import type { Entry } from "@/lib/journal";
import {
  canCreateLocalStorage,
  mustUseCloudStorage,
  resolveStorageChoice,
} from "@/lib/pageCreation";

function entry(overrides: Partial<Entry> = {}): Entry {
  return {
    id: "e1",
    content: "",
    content_json: null,
    content_storage: "cloud",
    created_at: "2026-01-01T00:00:00Z",
    user_id: "u1",
    pinned: false,
    parent_id: null,
    title: "",
    share_token: null,
    layout: {},
    sort_order: null,
    deleted_at: null,
    ...overrides,
  };
}

describe("pageCreation", () => {
  it("inherits local storage from a local parent", () => {
    expect(
      resolveStorageChoice({
        userDefault: "cloud",
        parentEntry: entry({ content_storage: "local" }),
      }),
    ).toBe("local");
  });

  it("asks when preference is ask and parent is not local", () => {
    expect(
      resolveStorageChoice({
        userDefault: "ask",
        parentEntry: entry({ content_storage: "cloud" }),
      }),
    ).toBe("ask");
  });

  it("forces cloud for collaborator-owned trees", () => {
    expect(
      mustUseCloudStorage(entry({ user_id: "owner-a" }), { e1: "editor" }, "user-b"),
    ).toBe(true);
    expect(mustUseCloudStorage(entry({ user_id: "u1" }), {}, "u1")).toBe(false);
  });

  it("requires vault connection for local pages", () => {
    expect(canCreateLocalStorage("u1", "local", false)).toEqual({ ok: false, reason: "vault" });
    expect(canCreateLocalStorage("u1", "local", true)).toEqual({ ok: true });
    expect(canCreateLocalStorage("u1", "cloud", false)).toEqual({ ok: true });
  });
});
