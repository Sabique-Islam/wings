// Local-first draft cache for offline resilience.
//
// Reads are synchronous off an in-memory map that `hydrateDraftCache` fills at
// startup, so the load path never awaits storage. Durability is layered:
// IndexedDB holds the JSON blob (no 5MB cap, no stringify on the typing path),
// and the flush path additionally mirrors to localStorage because IndexedDB
// transactions started during tab close are not guaranteed to commit.

import type { JSONContent } from "@tiptap/core";
import type { FullEditorChangePayload } from "./editorPayload";
import {
  deleteDraftRow,
  deletePendingWriteRow,
  putDraftRow,
  putPendingWriteRow,
  readAllDrafts,
  readPendingWriteRows,
  type PendingWriteRow,
} from "./localStore";

const DRAFT_PREFIX = "wings_draft_";
const DRAFT_JSON_PREFIX = "wings_draft_json_";
const DRAFT_AT_PREFIX = "wings_draft_at_";
const PENDING_PREFIX = "wings_pending_";

const LEGACY_DRAFT_PREFIX = "nw_draft_";
const LEGACY_PENDING_PREFIX = "nw_pending_";

export interface DraftPayload {
  /** Absent on drafts written from the typing path, which carry JSON only. */
  markdown?: string;
  json?: JSONContent | null;
}

export interface StoredDraft {
  markdown: string;
  json: JSONContent | null;
}

interface CachedDraft extends StoredDraft {
  updatedAt: number;
}

export type PendingWrite = PendingWriteRow;

const drafts = new Map<string, CachedDraft>();
const draftTimers = new Map<string, ReturnType<typeof setTimeout>>();
const DRAFT_THROTTLE_MS = 400;

/** Read a draft straight out of localStorage, for pre-hydration and migration. */
function readMirror(entryId: string): CachedDraft | null {
  try {
    const markdown =
      localStorage.getItem(DRAFT_PREFIX + entryId) ??
      localStorage.getItem(LEGACY_DRAFT_PREFIX + entryId);
    const jsonRaw = localStorage.getItem(DRAFT_JSON_PREFIX + entryId);
    if (markdown == null && jsonRaw == null) return null;
    let json: JSONContent | null = null;
    if (jsonRaw) {
      try {
        json = JSON.parse(jsonRaw) as JSONContent;
      } catch {
        json = null;
      }
    }
    return {
      markdown: markdown ?? "",
      json,
      updatedAt: Number(localStorage.getItem(DRAFT_AT_PREFIX + entryId)) || 0,
    };
  } catch {
    return null;
  }
}

function writeMirror(entryId: string, draft: CachedDraft): void {
  try {
    localStorage.setItem(DRAFT_PREFIX + entryId, draft.markdown);
    if (draft.json) {
      localStorage.setItem(DRAFT_JSON_PREFIX + entryId, JSON.stringify(draft.json));
    }
    localStorage.setItem(DRAFT_AT_PREFIX + entryId, String(draft.updatedAt));
  } catch {
    // Storage full — IndexedDB still holds the draft.
  }
}

/**
 * Load persisted drafts into memory. Await this before the first `getDraft`,
 * otherwise a draft that only exists in IndexedDB reads as absent.
 */
export async function hydrateDraftCache(): Promise<void> {
  const rows = await readAllDrafts();
  for (const row of rows) {
    drafts.set(row.entryId, {
      markdown: row.markdown,
      json: row.json,
      updatedAt: row.updatedAt,
    });
  }
  // Drafts written by an older release, or by a tab that closed before its
  // IndexedDB transaction committed, only exist in the mirror.
  try {
    const mirrored = new Set<string>();
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      for (const prefix of [DRAFT_PREFIX, DRAFT_JSON_PREFIX, LEGACY_DRAFT_PREFIX]) {
        if (key.startsWith(prefix)) mirrored.add(key.slice(prefix.length));
      }
    }
    for (const entryId of mirrored) {
      const mirror = readMirror(entryId);
      if (!mirror) continue;
      const known = drafts.get(entryId);
      if (known && known.updatedAt >= mirror.updatedAt) continue;
      drafts.set(entryId, mirror);
      void putDraftRow({ entryId, ...mirror });
    }
  } catch {
    // localStorage unavailable — IndexedDB rows are already loaded.
  }
}

function writeDraft(entryId: string, payload: DraftPayload, mirror: boolean): void {
  const previous = drafts.get(entryId);
  // Keep the last markdown we stored rather than blanking it: a JSON-only
  // draft means the editor hasn't rendered markdown since, not that the page
  // is empty.
  const next: CachedDraft = {
    markdown: payload.markdown ?? previous?.markdown ?? "",
    json: payload.json ?? previous?.json ?? null,
    updatedAt: Date.now(),
  };
  drafts.set(entryId, next);
  void putDraftRow({ entryId, ...next });
  if (mirror) writeMirror(entryId, next);
}

/** Throttled draft save — coalesces rapid keystrokes. */
export function saveDraftThrottled(entryId: string, payload: DraftPayload): void {
  const existing = draftTimers.get(entryId);
  if (existing) clearTimeout(existing);
  draftTimers.set(
    entryId,
    setTimeout(() => {
      draftTimers.delete(entryId);
      writeDraft(entryId, payload, false);
    }, DRAFT_THROTTLE_MS),
  );
}

/** Immediate draft write (flush on unload / route change). */
export function saveDraft(entryId: string, payload: DraftPayload): void {
  const existing = draftTimers.get(entryId);
  if (existing) {
    clearTimeout(existing);
    draftTimers.delete(entryId);
  }
  writeDraft(entryId, payload, true);
}

export function getDraft(entryId: string): StoredDraft | null {
  const cached = drafts.get(entryId) ?? readMirror(entryId);
  if (!cached) return null;
  return { markdown: cached.markdown, json: cached.json };
}

export function clearDraft(entryId: string): void {
  const timer = draftTimers.get(entryId);
  if (timer) {
    clearTimeout(timer);
    draftTimers.delete(entryId);
  }
  drafts.delete(entryId);
  void deleteDraftRow(entryId);
  try {
    localStorage.removeItem(DRAFT_PREFIX + entryId);
    localStorage.removeItem(DRAFT_JSON_PREFIX + entryId);
    localStorage.removeItem(DRAFT_AT_PREFIX + entryId);
    localStorage.removeItem(LEGACY_DRAFT_PREFIX + entryId);
  } catch {
    // ignore
  }
}

export function queuePendingWrite(entryId: string, payload: FullEditorChangePayload): void {
  const pending: PendingWrite = {
    entryId,
    content: payload.markdown,
    contentJson: payload.json ?? null,
    timestamp: Date.now(),
  };
  void putPendingWriteRow(pending);
  try {
    localStorage.setItem(PENDING_PREFIX + entryId, JSON.stringify(pending));
  } catch {
    // ignore
  }
}

export async function getPendingWrites(): Promise<PendingWrite[]> {
  const byEntry = new Map<string, PendingWrite>();
  for (const row of await readPendingWriteRows()) {
    byEntry.set(row.entryId, row);
  }
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(PENDING_PREFIX) && !key?.startsWith(LEGACY_PENDING_PREFIX)) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw) as PendingWrite;
        const known = byEntry.get(parsed.entryId);
        if (!known || known.timestamp < parsed.timestamp) byEntry.set(parsed.entryId, parsed);
      } catch {
        // corrupt entry
      }
    }
  } catch {
    // ignore
  }
  return Array.from(byEntry.values());
}

export function clearPendingWrite(entryId: string): void {
  void deletePendingWriteRow(entryId);
  try {
    localStorage.removeItem(PENDING_PREFIX + entryId);
    localStorage.removeItem(LEGACY_PENDING_PREFIX + entryId);
  } catch {
    // ignore
  }
}
