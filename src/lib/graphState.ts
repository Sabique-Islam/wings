import { readGraphState, putGraphState, type GraphStateRow } from "./localStore";
import type { GraphFilters } from "./graphLayout";

const DEBOUNCE_MS = 300;

let saveTimer: ReturnType<typeof setTimeout> | null = null;

export const DEFAULT_GRAPH_FILTERS: GraphFilters = {
  hideUnlinked: false,
  orphansOnly: false,
  tag: null,
};

export function defaultGraphState(userId: string): GraphStateRow {
  return {
    userId,
    mode: "global",
    depth: 2,
    filters: { ...DEFAULT_GRAPH_FILTERS },
    positions: {},
    viewport: null,
    updatedAt: Date.now(),
  };
}

export async function loadGraphState(userId: string): Promise<GraphStateRow> {
  const stored = await readGraphState(userId);
  if (!stored) return defaultGraphState(userId);
  return {
    ...defaultGraphState(userId),
    ...stored,
    filters: { ...DEFAULT_GRAPH_FILTERS, ...stored.filters },
    positions: stored.positions ?? {},
  };
}

export function scheduleGraphStateSave(row: GraphStateRow): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    void putGraphState({ ...row, updatedAt: Date.now() });
  }, DEBOUNCE_MS);
}

export function flushGraphStateSave(row: GraphStateRow): void {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  void putGraphState({ ...row, updatedAt: Date.now() });
}
