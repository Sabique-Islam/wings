import { describe, expect, it } from "vitest";
import {
  mapShareWorkspacePayload,
  mergeOwnEntriesWithShared,
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
  content_storage: "cloud",
  layout: {},
  sort_order: null,
  deleted_at: null,
});

describe("mapShareWorkspacePayload", () => {
  it("maps collaborator entries, roles, and owned shared ids", () => {
    const result = mapShareWorkspacePayload({
      owned_shared_ids: ["mine-shared"],
      collaborators: [
        {
          id: "theirs",
          content: "hello",
          content_json: null,
          created_at: "2026-01-02T00:00:00Z",
          user_id: "user-b",
          pinned: false,
          parent_id: null,
          title: "Shared page",
          layout: {},
          deleted_at: null,
          role: "editor",
        },
      ],
    });

    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].id).toBe("theirs");
    expect(result.entries[0].share_token).toBeNull();
    expect(result.roleMap).toEqual({ theirs: "editor" });
    expect([...result.sharedEntryIds].sort()).toEqual(["mine-shared", "theirs"]);
  });

  it("handles empty payload", () => {
    const result = mapShareWorkspacePayload({
      collaborators: [],
      owned_shared_ids: [],
    });
    expect(result.entries).toEqual([]);
    expect(result.roleMap).toEqual({});
    expect(result.sharedEntryIds.size).toBe(0);
  });

  it("ignores owner role on collaborator rows", () => {
    const result = mapShareWorkspacePayload({
      owned_shared_ids: [],
      collaborators: [
        {
          id: "theirs",
          content: "",
          created_at: "2026-01-02T00:00:00Z",
          user_id: "user-b",
          pinned: false,
          parent_id: null,
          title: "",
          role: "owner",
        },
      ],
    });
    expect(result.roleMap).toEqual({});
    expect(result.sharedEntryIds.has("theirs")).toBe(true);
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
