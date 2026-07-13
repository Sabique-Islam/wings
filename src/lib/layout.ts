import { supabase } from "@/integrations/supabase/client";

/**
 * Per-block free-canvas layout, keyed by a stable identity that survives
 * markdown round-trips: image src URL for <img>, sceneId for drawings.
 * If `x` is null the node renders inline (default). Otherwise it floats
 * absolutely within the editor canvas at (x,y) sized (w,h) at z-index z.
 */
export interface BlockLayout {
  x: number | null;
  y: number;
  w: number;
  h: number;
  z: number;
}

export type EntryLayoutMap = Record<string, BlockLayout>;

export function emptyLayout(): EntryLayoutMap {
  return {};
}

export function normalizeLayout(raw: unknown): EntryLayoutMap {
  if (!raw || typeof raw !== "object") return {};
  const out: EntryLayoutMap = {};
  for (const [k, v] of Object.entries(raw as Record<string, any>)) {
    if (!v || typeof v !== "object") continue;
    out[k] = {
      x: typeof v.x === "number" ? v.x : null,
      y: Number(v.y) || 0,
      w: Number(v.w) || 0,
      h: Number(v.h) || 0,
      z: Number(v.z) || 0,
    };
  }
  return out;
}

// Debounced per-entry persistence so high-frequency drag updates collapse
// into a single network write.
const timers = new Map<string, ReturnType<typeof setTimeout>>();

export function saveEntryLayout(entryId: string, layout: EntryLayoutMap, delayMs = 400): void {
  const existing = timers.get(entryId);
  if (existing) clearTimeout(existing);
  const t = setTimeout(async () => {
    timers.delete(entryId);
    try {
      await (supabase as any).from("entries").update({ layout }).eq("id", entryId);
    } catch (err) {
      console.error("[layout] save failed", err);
    }
  }, delayMs);
  timers.set(entryId, t);
}

export function flushEntryLayout(entryId: string): void {
  const t = timers.get(entryId);
  if (t) {
    clearTimeout(t);
    timers.delete(entryId);
  }
}
