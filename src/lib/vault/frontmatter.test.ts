import { describe, it, expect } from "vitest";
import {
  entryToRelativePath,
  parseVaultMarkdown,
  serializeVaultMarkdown,
  slug,
} from "./frontmatter";
import type { Entry } from "@/lib/journal";

function entry(overrides: Partial<Entry> = {}): Entry {
  return {
    id: "e1",
    content: "# Hello\n\nBody text",
    content_json: null,
    created_at: "2026-01-15T00:00:00.000Z",
    user_id: "u1",
    pinned: false,
    parent_id: null,
    title: "Hello",
    share_token: null,
    layout: {},
    deleted_at: null,
    ...overrides,
  };
}

describe("serializeVaultMarkdown", () => {
  it("includes wings_id and title in frontmatter", () => {
    const md = serializeVaultMarkdown(entry(), ["research"]);
    expect(md).toContain("wings_id: e1");
    expect(md).toContain("title: Hello");
    expect(md).toContain("tags: [research]");
    expect(md).toContain("# Hello");
  });
});

describe("parseVaultMarkdown", () => {
  it("reads wings_id and body from exported markdown", () => {
    const md = serializeVaultMarkdown(entry());
    const parsed = parseVaultMarkdown(md);
    expect(parsed.wingsId).toBe("e1");
    expect(parsed.title).toBe("Hello");
    expect(parsed.body).toContain("# Hello");
  });
});

describe("entryToRelativePath", () => {
  it("nests files under parent folder names", () => {
    const parent = entry({ id: "p1", title: "Projects", parent_id: null });
    const child = entry({ id: "c1", title: "Notes", parent_id: "p1" });
    const map = new Map([
      ["p1", parent],
      ["c1", child],
    ]);
    expect(entryToRelativePath(child, map)).toBe("Projects/Notes.md");
  });
});

describe("slug", () => {
  it("creates filesystem-safe names", () => {
    expect(slug("Hello World!")).toBe("Hello-World");
  });
});
