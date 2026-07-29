import { describe, it, expect } from "vitest";
import { planVaultFileSync, type VaultWriteLog } from "./syncPlan";
import { contentHash, type VaultFileEntry } from "./types";
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
    properties: { status: null, date: null, tags: [] },
    sort_order: null,
    deleted_at: null,
    ...overrides,
  };
}

function file(overrides: Partial<VaultFileEntry> = {}): VaultFileEntry {
  return {
    wingsId: "e1",
    title: "Hello",
    content: "# Hello\n\nBody text",
    tags: [],
    relativePath: "Hello.md",
    lastModified: 2_000,
    ...overrides,
  };
}

const emptyLog: VaultWriteLog = { lastWrittenAt: {}, lastWrittenHash: {} };

describe("planVaultFileSync", () => {
  it("creates a page for a file Wings has never seen", () => {
    const action = planVaultFileSync(file({ wingsId: null }), undefined, emptyLog);
    expect(action).toEqual({ kind: "create", body: "# Hello\n\nBody text" });
  });

  it("moves a new file's frontmatter title into the body so the page keeps its name", () => {
    const action = planVaultFileSync(
      file({ wingsId: null, title: "Groceries", content: "milk\neggs" }),
      undefined,
      emptyLog,
    );
    expect(action).toEqual({ kind: "create", body: "# Groceries\n\nmilk\neggs" });
  });

  it("never injects a heading into a page that already exists", () => {
    const existing = entry({ content: "milk\neggs" });
    const action = planVaultFileSync(
      file({ title: "Groceries", content: "milk\neggs\nbread" }),
      existing,
      emptyLog,
    );
    expect(action).toEqual({ kind: "update", body: "milk\neggs\nbread" });
  });

  it("treats a page whose content has no heading as unchanged", () => {
    const existing = entry({ content: "milk\neggs" });
    const action = planVaultFileSync(file({ title: "Groceries", content: "milk\neggs" }), existing, emptyLog);
    expect(action).toEqual({ kind: "skip", reason: "unchanged" });
  });

  it("ignores line-ending and trailing-whitespace differences", () => {
    const existing = entry({ content: "# Hello\n\nBody text" });
    const action = planVaultFileSync(file({ content: "# Hello\r\n\r\nBody text   \r\n" }), existing, emptyLog);
    expect(action).toEqual({ kind: "skip", reason: "unchanged" });
  });

  it("updates the page when the file has newer content", () => {
    const existing = entry();
    const action = planVaultFileSync(file({ content: "# Hello\n\nEdited on disk" }), existing, emptyLog);
    expect(action).toEqual({ kind: "update", body: "# Hello\n\nEdited on disk" });
  });

  it("reports a conflict when Wings wrote the page after the file was touched", () => {
    const existing = entry({ content: "# Hello\n\nTyped in the app" });
    const log: VaultWriteLog = {
      lastWrittenAt: { e1: 5_000 },
      lastWrittenHash: { e1: contentHash("# Hello\n\nTyped in the app") },
    };
    const action = planVaultFileSync(
      file({ content: "# Hello\n\nEdited on disk", lastModified: 1_000 }),
      existing,
      log,
    );
    expect(action).toEqual({ kind: "conflict" });
  });

  it("accepts the file when it was touched after Wings last wrote", () => {
    const existing = entry();
    const log: VaultWriteLog = {
      lastWrittenAt: { e1: 1_000 },
      lastWrittenHash: { e1: contentHash("# Hello\n\nBody text") },
    };
    const action = planVaultFileSync(
      file({ content: "# Hello\n\nEdited on disk", lastModified: 5_000 }),
      existing,
      log,
    );
    expect(action.kind).toBe("update");
  });

  it("skips an empty file rather than blanking the page", () => {
    const action = planVaultFileSync(file({ content: "   \n\n" }), entry(), emptyLog);
    expect(action).toEqual({ kind: "skip", reason: "empty" });
  });

  it("skips a file pointing at a page that no longer exists", () => {
    const action = planVaultFileSync(file({ wingsId: "gone" }), undefined, emptyLog);
    expect(action).toEqual({ kind: "skip", reason: "unknown-page" });
  });
});
