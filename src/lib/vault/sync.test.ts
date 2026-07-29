/**
 * Sync integration coverage for the decisions that used to desync Wings from
 * the folder: hash normalisation, create-with-parent, and conflict reporting.
 *
 * File-system and Supabase I/O are mocked so the suite stays unit-speed while
 * still exercising `syncFromVault` end to end.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { contentHash, normalizeVaultContent, type VaultFileEntry } from "./types";
import { planVaultFileSync } from "./syncPlan";
import type { Entry } from "@/lib/journal";

const createEntry = vi.fn();
const updateEntry = vi.fn();
const moveEntry = vi.fn();
const putVaultMeta = vi.fn();
const writeEntryToVault = vi.fn();
const scanVaultFolder = vi.fn();

vi.mock("@/lib/journal", async () => {
  const actual = await vi.importActual<typeof import("@/lib/journal")>("@/lib/journal");
  return {
    ...actual,
    createEntry: (...args: unknown[]) => createEntry(...args),
    updateEntry: (...args: unknown[]) => updateEntry(...args),
    moveEntry: (...args: unknown[]) => moveEntry(...args),
  };
});

vi.mock("@/lib/localStore", () => ({
  putVaultMeta: (...args: unknown[]) => putVaultMeta(...args),
}));

vi.mock("./write", () => ({
  writeEntryToVault: (...args: unknown[]) => writeEntryToVault(...args),
}));

vi.mock("./read", () => ({
  scanVaultFolder: (...args: unknown[]) => scanVaultFolder(...args),
}));

vi.mock("@/lib/entryContent", () => ({
  payloadFromMarkdown: (markdown: string) => ({
    markdown,
    json: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: markdown }] }] },
  }),
}));

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

const metaBase = {
  userId: "u1",
  folderName: "vault",
  connectedAt: 1,
  handle: {} as FileSystemDirectoryHandle,
  lastWrittenAt: {} as Record<string, number>,
  lastWrittenHash: {} as Record<string, string>,
};

describe("vault sync integration", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    writeEntryToVault.mockImplementation(async (_h, _e, _all, meta) => meta);
    putVaultMeta.mockResolvedValue(undefined);
    updateEntry.mockResolvedValue(undefined);
    moveEntry.mockResolvedValue(undefined);
  });

  it("hashes the same body whether the file used CRLF or trailing spaces", () => {
    const a = contentHash("# Hello\n\nBody text");
    const b = contentHash(normalizeVaultContent("# Hello\r\n\r\nBody text   \r\n"));
    expect(a).toBe(b);
    expect(planVaultFileSync(file({ content: "# Hello\r\n\r\nBody text   \r\n" }), entry(), metaBase)).toEqual({
      kind: "skip",
      reason: "unchanged",
    });
  });

  it("creates a nested page under the parent implied by its path", async () => {
    const { syncFromVault } = await import("./sync");
    const parent = entry({ id: "p1", title: "Projects", content: "# Projects" });
    scanVaultFolder.mockResolvedValue([
      file({
        wingsId: null,
        title: "Notes",
        content: "nested body",
        tags: ["research"],
        relativePath: "Projects/Notes.md",
      }),
    ]);
    createEntry.mockResolvedValue(
      entry({ id: "c1", title: "Notes", content: "# Notes\n\nnested body", parent_id: "p1" }),
    );

    const onEntriesChanged = vi.fn();
    const { result } = await syncFromVault(
      "u1",
      {} as FileSystemDirectoryHandle,
      [parent],
      metaBase,
      onEntriesChanged,
    );

    expect(createEntry).toHaveBeenCalledWith("u1", "# Notes\n\nnested body", "p1");
    expect(result.created).toBe(1);
    expect(writeEntryToVault).toHaveBeenCalled();
  });

  it("updates content and re-parents when a file moves under another page", async () => {
    const { syncFromVault } = await import("./sync");
    const parent = entry({ id: "p1", title: "Projects", content: "# Projects" });
    const child = entry({ id: "c1", title: "Notes", content: "old", parent_id: null });
    scanVaultFolder.mockResolvedValue([
      file({
        wingsId: "c1",
        content: "new body",
        tags: ["moved"],
        relativePath: "Projects/Notes.md",
        lastModified: 9_000,
      }),
    ]);

    const { result } = await syncFromVault(
      "u1",
      {} as FileSystemDirectoryHandle,
      [parent, child],
      metaBase,
      vi.fn(),
    );

    expect(updateEntry).toHaveBeenCalled();
    expect(moveEntry).toHaveBeenCalledWith("c1", "p1");
    expect(result.updated).toBe(1);
  });

  it("surfaces a conflict instead of overwriting Wings-newer content", async () => {
    const { syncFromVault } = await import("./sync");
    const existing = entry({ content: "# Hello\n\nTyped in app" });
    scanVaultFolder.mockResolvedValue([
      file({ content: "# Hello\n\nEdited on disk", lastModified: 1_000 }),
    ]);

    const { result } = await syncFromVault(
      "u1",
      {} as FileSystemDirectoryHandle,
      [existing],
      {
        ...metaBase,
        lastWrittenAt: { e1: 5_000 },
        lastWrittenHash: { e1: contentHash("# Hello\n\nTyped in app") },
      },
      vi.fn(),
    );

    expect(updateEntry).not.toHaveBeenCalled();
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0].entryId).toBe("e1");
  });
});
