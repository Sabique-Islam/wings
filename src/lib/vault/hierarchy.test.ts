import { describe, it, expect } from "vitest";
import {
  parentIdChangeForFile,
  propertiesWithVaultTags,
  resolveParentIdFromPath,
} from "./hierarchy";
import type { Entry } from "@/lib/journal";
import { EMPTY_PROPERTIES } from "@/lib/entryProperties";

function entry(overrides: Partial<Entry> = {}): Entry {
  return {
    id: "e1",
    content: "# Hello",
    content_json: null,
    created_at: "2026-01-15T00:00:00.000Z",
    user_id: "u1",
    pinned: false,
    parent_id: null,
    title: "Hello",
    share_token: null,
    layout: {},
    properties: EMPTY_PROPERTIES,
    sort_order: null,
    deleted_at: null,
    ...overrides,
  };
}

describe("resolveParentIdFromPath", () => {
  it("maps a nested file to the page that owns its folder", () => {
    const idByPath = new Map([["Projects.md", "p1"]]);
    expect(resolveParentIdFromPath("Projects/Notes.md", idByPath)).toBe("p1");
  });

  it("returns null for a top-level file", () => {
    expect(resolveParentIdFromPath("Notes.md", new Map())).toBeNull();
  });
});

describe("parentIdChangeForFile", () => {
  it("reports a move when the file lives under a new parent", () => {
    const idByPath = new Map([["Projects.md", "p1"]]);
    expect(parentIdChangeForFile("Projects/Notes.md", entry(), idByPath)).toBe("p1");
  });

  it("reports null when a nested page moves to the vault root", () => {
    expect(parentIdChangeForFile("Notes.md", entry({ parent_id: "p1" }), new Map())).toBeNull();
  });

  it("returns undefined when parent already matches", () => {
    const idByPath = new Map([["Projects.md", "p1"]]);
    expect(
      parentIdChangeForFile("Projects/Notes.md", entry({ parent_id: "p1" }), idByPath),
    ).toBeUndefined();
  });

  it("refuses to parent a page under itself", () => {
    const idByPath = new Map([["Hello.md", "e1"]]);
    expect(parentIdChangeForFile("Hello/Child.md", entry(), idByPath)).toBeUndefined();
  });
});

describe("propertiesWithVaultTags", () => {
  it("returns null when the file has no tags", () => {
    expect(propertiesWithVaultTags(EMPTY_PROPERTIES, [])).toBeNull();
  });

  it("merges frontmatter tags into existing properties", () => {
    expect(
      propertiesWithVaultTags({ status: "Done", date: null, tags: ["old"] }, ["New Tag", "old"]),
    ).toEqual({ status: "Done", date: null, tags: ["old", "new-tag"] });
  });

  it("returns null when tags are already present", () => {
    expect(propertiesWithVaultTags({ status: null, date: null, tags: ["a"] }, ["a"])).toBeNull();
  });
});
