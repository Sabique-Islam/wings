import { describe, expect, it } from "vitest";
import type { Entry } from "@/lib/journal";
import { buildAccountExportFiles, rewritePageLinkIds } from "@/lib/accountExport";
import { parseVaultMarkdown } from "@/lib/vault/frontmatter";

function entry(overrides: Partial<Entry> = {}): Entry {
  return {
    id: "e1",
    content: "# Hello\n\nSee [Notes](#page:e2).",
    content_json: null,
    content_storage: "cloud",
    created_at: "2026-01-01T00:00:00Z",
    user_id: "u1",
    pinned: false,
    parent_id: null,
    title: "Hello",
    share_token: null,
    layout: {},
    sort_order: null,
    deleted_at: null,
    ...overrides,
  };
}

describe("accountExport", () => {
  it("rewrites page link ids using the import remap table", () => {
    const md = "See [Notes](#page:old-id) and ![Card](#page:other).";
    const map = new Map([
      ["old-id", "new-id"],
      ["other", "other-new"],
    ]);
    expect(rewritePageLinkIds(md, map)).toBe(
      "See [Notes](#page:new-id) and ![Card](#page:other-new).",
    );
  });

  it("nests exported files under parent folder slugs", () => {
    const parent = entry({ id: "p1", title: "Projects", content: "# Projects" });
    const child = entry({
      id: "c1",
      title: "Notes",
      content: "# Notes\n\nBody",
      parent_id: "p1",
    });
    const files = buildAccountExportFiles([parent, child]);
    expect(files.find((f) => f.relativePath === "Projects.md")).toBeDefined();
    expect(files.find((f) => f.relativePath === "Projects/Notes.md")).toBeDefined();
  });

  it("writes wings_id frontmatter for round-trip import", () => {
    const files = buildAccountExportFiles([entry({ id: "abc-123" })]);
    const parsed = parseVaultMarkdown(files[0].markdown);
    expect(parsed.wingsId).toBe("abc-123");
    expect(parsed.body).toContain("See [Notes]");
  });

  it("skips trashed pages", () => {
    const files = buildAccountExportFiles([
      entry({ id: "live" }),
      entry({ id: "gone", deleted_at: "2026-02-01T00:00:00Z" }),
    ]);
    expect(files).toHaveLength(1);
    expect(files[0].markdown).toContain("wings_id: live");
  });
});
