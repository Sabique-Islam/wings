// Local-first draft cache for offline resilience.
// Draft writes are throttled — never sync localStorage on every keystroke.

import type { JSONContent } from "@tiptap/core";

const DRAFT_PREFIX = "wings_draft_";
const DRAFT_JSON_PREFIX = "wings_draft_json_";
const PENDING_PREFIX = "wings_pending_";

const LEGACY_DRAFT_PREFIX = "nw_draft_";
const LEGACY_PENDING_PREFIX = "nw_pending_";

export interface DraftPayload {
  markdown: string;
  json?: JSONContent | null;
}

interface PendingWrite {
  entryId: string;
  content: string;
  contentJson?: JSONContent | null;
  timestamp: number;
}

const draftTimers = new Map<string, ReturnType<typeof setTimeout>>();
const DRAFT_THROTTLE_MS = 400;

function writeDraft(entryId: string, payload: DraftPayload): void {
  try {
    localStorage.setItem(DRAFT_PREFIX + entryId, payload.markdown);
    if (payload.json) {
      localStorage.setItem(DRAFT_JSON_PREFIX + entryId, JSON.stringify(payload.json));
    }
  } catch {
    // Storage full — silently ignore
  }
}

/** Throttled draft save — coalesces rapid keystrokes. */
export function saveDraftThrottled(entryId: string, payload: DraftPayload): void {
  const existing = draftTimers.get(entryId);
  if (existing) clearTimeout(existing);
  draftTimers.set(
    entryId,
    setTimeout(() => {
      draftTimers.delete(entryId);
      writeDraft(entryId, payload);
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
  writeDraft(entryId, payload);
}

export function getDraft(entryId: string): DraftPayload | null {
  try {
    const markdown =
      localStorage.getItem(DRAFT_PREFIX + entryId) ??
      localStorage.getItem(LEGACY_DRAFT_PREFIX + entryId);
    if (markdown == null) return null;
    const jsonRaw = localStorage.getItem(DRAFT_JSON_PREFIX + entryId);
    let json: JSONContent | null = null;
    if (jsonRaw) {
      try {
        json = JSON.parse(jsonRaw) as JSONContent;
      } catch {
        json = null;
      }
    }
    return { markdown, json };
  } catch {
    return null;
  }
}

export function clearDraft(entryId: string): void {
  try {
    localStorage.removeItem(DRAFT_PREFIX + entryId);
    localStorage.removeItem(DRAFT_JSON_PREFIX + entryId);
    localStorage.removeItem(LEGACY_DRAFT_PREFIX + entryId);
  } catch {
    // ignore
  }
}

export function queuePendingWrite(entryId: string, payload: DraftPayload): void {
  try {
    const pending: PendingWrite = {
      entryId,
      content: payload.markdown,
      contentJson: payload.json ?? null,
      timestamp: Date.now(),
    };
    localStorage.setItem(PENDING_PREFIX + entryId, JSON.stringify(pending));
  } catch {
    // ignore
  }
}

export function getPendingWrites(): PendingWrite[] {
  const writes: PendingWrite[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(PENDING_PREFIX) || key?.startsWith(LEGACY_PENDING_PREFIX)) {
        const val = localStorage.getItem(key);
        if (val) {
          try {
            writes.push(JSON.parse(val));
          } catch {
            // corrupt entry
          }
        }
      }
    }
  } catch {
    // ignore
  }
  return writes;
}

export function clearPendingWrite(entryId: string): void {
  try {
    localStorage.removeItem(PENDING_PREFIX + entryId);
    localStorage.removeItem(LEGACY_PENDING_PREFIX + entryId);
  } catch {
    // ignore
  }
}
