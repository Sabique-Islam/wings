// Client-side link graph.
//
// Backlinks and the graph view are reverse lookups over this index, so opening a
// page or the graph costs zero network calls. Rebuilds run in a worker and land
// in IndexedDB, keeping both the parse and the write off the typing path.

import type { JSONContent } from "@tiptap/core";
import { extractLinks } from "./linkExtraction";
import {
  deleteLinkIndexRow,
  putLinkIndexRow,
  readLinkIndex,
  type LinkIndexRow,
} from "./localStore";
import type { LinkIndexRequest, LinkIndexResponse } from "@/workers/linkIndexWorker";

const INDEX_DEBOUNCE_MS = 500;

const rows = new Map<string, LinkIndexRow>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();
const listeners = new Set<() => void>();
/** Bumped on every change so `useSyncExternalStore` sees a new snapshot. */
let version = 0;
let worker: Worker | null | undefined;

function notify(): void {
  version += 1;
  for (const listener of listeners) listener();
}

function commit(result: LinkIndexResponse): void {
  const previous = rows.get(result.entryId);
  const unchanged =
    previous != null &&
    previous.outgoing.join("\u0000") === result.outgoing.join("\u0000") &&
    previous.unresolved.join("\u0000") === result.unresolved.join("\u0000");
  if (unchanged) return;
  const row: LinkIndexRow = { ...result, updatedAt: Date.now() };
  rows.set(row.entryId, row);
  void putLinkIndexRow(row);
  notify();
}

function indexWorker(): Worker | null {
  if (worker !== undefined) return worker;
  if (typeof Worker === "undefined") {
    worker = null;
    return worker;
  }
  try {
    const instance = new Worker(new URL("../workers/linkIndexWorker.ts", import.meta.url), {
      type: "module",
    });
    instance.onmessage = ({ data }: MessageEvent<LinkIndexResponse>) => commit(data);
    instance.onerror = () => {
      // Fall back to the main thread rather than silently stopping indexing.
      worker = null;
    };
    worker = instance;
  } catch {
    worker = null;
  }
  return worker;
}

/** Load the persisted index. Await before rendering backlinks or the graph. */
export async function hydrateLinkIndex(): Promise<void> {
  for (const row of await readLinkIndex()) rows.set(row.entryId, row);
  notify();
}

/** Queue a rebuild for one page. Safe to call on every editor emit. */
export function scheduleLinkIndex(entryId: string, doc: JSONContent): void {
  const existing = timers.get(entryId);
  if (existing) clearTimeout(existing);
  timers.set(
    entryId,
    setTimeout(() => {
      timers.delete(entryId);
      const request: LinkIndexRequest = { entryId, doc };
      const instance = indexWorker();
      if (instance) {
        instance.postMessage(request);
        return;
      }
      commit({ entryId, ...extractLinks(doc) });
    }, INDEX_DEBOUNCE_MS),
  );
}

export function forgetLinkIndex(entryId: string): void {
  const timer = timers.get(entryId);
  if (timer) {
    clearTimeout(timer);
    timers.delete(entryId);
  }
  if (!rows.delete(entryId)) return;
  void deleteLinkIndexRow(entryId);
  notify();
}

/** Pages that link to `entryId`. */
export function getBacklinks(entryId: string): string[] {
  const sources: string[] = [];
  for (const row of rows.values()) {
    if (row.entryId !== entryId && row.outgoing.includes(entryId)) sources.push(row.entryId);
  }
  return sources;
}

export function getOutgoingLinks(entryId: string): string[] {
  return rows.get(entryId)?.outgoing ?? [];
}

export function getUnresolvedLinks(entryId: string): string[] {
  return rows.get(entryId)?.unresolved ?? [];
}

/** Directed edges for the graph view, restricted to pages that still exist. */
export function getLinkEdges(knownIds: Set<string>): Array<{ from: string; to: string }> {
  const edges: Array<{ from: string; to: string }> = [];
  for (const row of rows.values()) {
    if (!knownIds.has(row.entryId)) continue;
    for (const to of row.outgoing) {
      if (to !== row.entryId && knownIds.has(to)) edges.push({ from: row.entryId, to });
    }
  }
  return edges;
}

export function subscribeLinkIndex(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getLinkIndexVersion(): number {
  return version;
}
