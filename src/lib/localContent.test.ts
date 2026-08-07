import { describe, expect, it } from "vitest";
import type { Entry } from "@/lib/journal";
import {
  getCanonicalContent,
  isLocalEntry,
  normalizeContentStorage,
} from "@/lib/localContent";

function row(overrides: Partial<Entry> = {}): Entry {
  return {
    id: "e1",
    content: "hello",
    content_json: null,
    content_storage: "cloud",
    created_at: "2026-01-01T00:00:00Z",
    user_id: "u1",
    pinned: false,
    parent_id: null,
    title: "Page",
    share_token: null,
    layout: {},
    sort_order: null,
    deleted_at: null,
    ...overrides,
  };
}

describe("localContent", () => {
  it("normalizes unknown storage to cloud", () => {
    expect(normalizeContentStorage(undefined)).toBe("cloud");
    expect(normalizeContentStorage("local")).toBe("local");
    expect(normalizeContentStorage("weird")).toBe("cloud");
  });

  it("detects local entries", () => {
    expect(isLocalEntry(row({ content_storage: "local" }))).toBe(true);
    expect(isLocalEntry(row({ content_storage: "cloud" }))).toBe(false);
  });

  it("uses entry content for guards regardless of storage flag", () => {
    expect(getCanonicalContent(row({ content: "typed locally", content_storage: "local" }))).toBe(
      "typed locally",
    );
  });
});
