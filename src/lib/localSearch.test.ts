import { describe, expect, it } from "vitest";
import { searchLocalEntries } from "./localSearch";
import type { Entry } from "./journal";

function entry(id: string, content: string, title?: string): Entry {
  return {
    id,
    content,
    content_json: null,
    created_at: "2026-01-01T00:00:00.000Z",
    user_id: "u1",
    pinned: false,
    parent_id: null,
    title: title ?? null,
    share_token: null,
    layout: null,
    deleted_at: null,
  } as Entry;
}

describe("searchLocalEntries", () => {
  const entries = [
    entry("1", "Notes about deployment pipelines", "Infra"),
    entry("2", "# Release notes\n\nShipped the graph view"),
    entry("3", "# Releases\n\nnothing yet"),
  ];

  it("returns recent entries when the query is empty", () => {
    const hits = searchLocalEntries(entries, "  ");
    expect(hits.map((h) => h.entry.id)).toEqual(["1", "2", "3"]);
    expect(hits.every((h) => h.snippet === null)).toBe(true);
  });

  it("ranks title prefix matches above other title matches", () => {
    const hits = searchLocalEntries(entries, "release");
    expect(hits[0]?.entry.id).toBe("2");
  });

  it("ranks title matches above body matches", () => {
    const hits = searchLocalEntries(entries, "notes");
    expect(hits.map((h) => h.entry.id)).toEqual(["2", "1"]);
  });

  it("shows a snippet only for body matches", () => {
    const hits = searchLocalEntries(entries, "graph view");
    expect(hits).toHaveLength(1);
    expect(hits[0]?.snippet).toContain("graph view");
  });

  it("treats regex characters as plain text", () => {
    const hits = searchLocalEntries([entry("4", "cost is $5 (usd)")], "$5 (usd)");
    expect(hits).toHaveLength(1);
  });

  it("drops entries that match nothing", () => {
    expect(searchLocalEntries(entries, "kubernetes")).toEqual([]);
  });
});
