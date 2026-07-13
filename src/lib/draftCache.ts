// Local-first draft cache for offline resilience and undo-safety.
// We persist every keystroke locally (synchronously) so reloads, crashes
// or network errors never lose user text. The DB write is debounced separately.

const DRAFT_PREFIX = "wings_draft_";
const PENDING_PREFIX = "wings_pending_";

// Backward-compatible read of the older "nw_draft_" prefix so existing users
// don't lose any in-progress text after the rename.
const LEGACY_DRAFT_PREFIX = "nw_draft_";
const LEGACY_PENDING_PREFIX = "nw_pending_";

export function saveDraft(entryId: string, content: string): void {
  try {
    localStorage.setItem(DRAFT_PREFIX + entryId, content);
  } catch {
    // Storage full — silently ignore
  }
}

export function getDraft(entryId: string): string | null {
  try {
    return (
      localStorage.getItem(DRAFT_PREFIX + entryId) ??
      localStorage.getItem(LEGACY_DRAFT_PREFIX + entryId)
    );
  } catch {
    return null;
  }
}

export function clearDraft(entryId: string): void {
  try {
    localStorage.removeItem(DRAFT_PREFIX + entryId);
    localStorage.removeItem(LEGACY_DRAFT_PREFIX + entryId);
  } catch {
    // ignore
  }
}

// Pending writes queue for retry when offline
interface PendingWrite {
  entryId: string;
  content: string;
  timestamp: number;
}

export function queuePendingWrite(entryId: string, content: string): void {
  try {
    const pending: PendingWrite = { entryId, content, timestamp: Date.now() };
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
