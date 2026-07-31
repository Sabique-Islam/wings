import { describe, expect, it } from "vitest";
import {
  mergeOwnEntriesWithShared,
  workspaceNeedsShareBootstrap,
  type Entry,
} from "./journal";

const own = (id: string, userId = "user-a"): Entry => ({
  id,
  content: "",
  content_json: null,
  created_at: "2026-01-01T00:00:00Z",
  user_id: userId,
  pinned: false,
  parent_id: null,
  title: id,
  share_token: null,
  layout: {},
  sort_order: null,
  deleted_at: null,
});

describe("workspaceNeedsShareBootstrap", () => {
  it("requires bootstrap when there is no cached meta", () => {
    expect(workspaceNeedsShareBootstrap(null)).toBe(true);
  });

  it("skips bootstrap for solo accounts with empty share cache", () => {
    expect(
      workspaceNeedsShareBootstrap({
        sharedEntryIds: [],
        roleMap: { "page-1": "owner" },
      }),
    ).toBe(false);
  });

  it("requires bootstrap when cache lists shared pages", () => {
    expect(
      workspaceNeedsShareBootstrap({
        sharedEntryIds: ["page-1"],
        roleMap: { "page-1": "owner" },
      }),
    ).toBe(true);
  });

  it("requires bootstrap when the user is a collaborator", () => {
    expect(
      workspaceNeedsShareBootstrap({
        sharedEntryIds: [],
        roleMap: { "page-9": "editor" },
      }),
    ).toBe(true);
  });
});

describe("mergeOwnEntriesWithShared", () => {
  it("keeps collaborator pages while replacing owned pages", () => {
    const previous = [own("mine-old", "user-a"), own("theirs", "user-b")];
    const freshOwn = [own("mine-new", "user-a")];
    const merged = mergeOwnEntriesWithShared(previous, freshOwn, "user-a");
    expect(merged.map((e) => e.id).sort()).toEqual(["mine-new", "theirs"]);
  });
});
