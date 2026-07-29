// Client-side link graph.
//
// Backlinks and the graph view are reverse lookups over this index, so opening a
// page or the graph costs zero network calls. Rebuilds run in a worker and land
// in IndexedDB, keeping both the parse and the write off the typing path.

import type { JSONContent } from "@tiptap/core";
import {
  deleteLinkIndexRow,
  putLinkIndexRows,
  readLinkIndex,
  type LinkIndexRow,
} from "./localStore";
import { runLinkIndexJobs, type LinkIndexJob, type LinkIndexResult } from "./linkIndexJobs";

const INDEX_DEBOUNCE_MS = 500;

const rows = new Map<string, LinkIndexRow>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();
const listeners = new Set<() => void>();
/** Bumped on every change so `useSyncExternalStore` sees a new snapshot. */
let version = 0;
let worker: Worker | null | undefined;
/** Newest job issued per page, so a slower reply cannot undo a newer edit. */
const latestSeq = new Map<string, number>();
let nextSeq = 1;

function notify(): void {
  version += 1;
  for (const listener of listeners) listener();
}

function issueJob(entryId: string, doc: JSONContent | null, markdown?: string): LinkIndexJob {
  const seq = nextSeq++;
  latestSeq.set(entryId, seq);
  return { entryId, seq, doc, markdown };
}

function sameLinks(previous: LinkIndexRow | undefined, result: LinkIndexResult): boolean {
  if (!previous) return false;
  const key = (values: string[]) => values.join("\u0000");
  return (
    key(previous.outgoing) === key(result.outgoing) &&
    key(previous.unresolved) === key(result.unresolved) &&
    key(previous.tags ?? []) === key(result.tags)
  );
}

function commit(results: LinkIndexResult[]): void {
  const changed: LinkIndexRow[] = [];
  for (const result of results) {
    // A reply the user has already typed past would reintroduce stale links.
    if (result.seq < (latestSeq.get(result.entryId) ?? 0)) continue;
    if (sameLinks(rows.get(result.entryId), result)) continue;
    const row: LinkIndexRow = {
      entryId: result.entryId,
      outgoing: result.outgoing,
      unresolved: result.unresolved,
      tags: result.tags,
      updatedAt: Date.now(),
    };
    rows.set(row.entryId, row);
    changed.push(row);
  }
  if (changed.length === 0) return;
  void putLinkIndexRows(changed);
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
    instance.onmessage = ({ data }: MessageEvent<LinkIndexResult[]>) => commit(data);
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

function runJobs(jobs: LinkIndexJob[]): void {
  if (jobs.length === 0) return;
  const instance = indexWorker();
  if (instance) {
    instance.postMessage(jobs);
    return;
  }
  commit(runLinkIndexJobs(jobs));
}

/** Load the persisted index. Await before rendering backlinks or the graph. */
export async function hydrateLinkIndex(): Promise<void> {
  for (const row of await readLinkIndex()) {
    rows.set(row.entryId, { ...row, tags: row.tags ?? [] });
  }
  notify();
}

/** Queue a rebuild for one page. Safe to call on every editor emit. */
export function scheduleLinkIndex(entryId: string, doc: JSONContent, markdown?: string): void {
  const existing = timers.get(entryId);
  if (existing) clearTimeout(existing);
  timers.set(
    entryId,
    setTimeout(() => {
      timers.delete(entryId);
      runJobs([issueJob(entryId, doc, markdown)]);
    }, INDEX_DEBOUNCE_MS),
  );
}

/**
 * Rebuild the index for a whole workspace.
 *
 * The editor only indexes pages as they are edited, so a fresh browser, an
 * import, or a vault sync would otherwise leave backlinks and the graph blank
 * until every page had been opened. Rows that come back identical are dropped
 * before any write, which keeps the common "nothing changed" reload cheap.
 */
export function reindexEntries(
  entries: Array<{ id: string; content: string; content_json?: JSONContent | null }>,
): void {
  runJobs(entries.map((entry) => issueJob(entry.id, entry.content_json ?? null, entry.content)));
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

export function getTagsForEntry(entryId: string): string[] {
  return rows.get(entryId)?.tags ?? [];
}

export function getAllTags(): string[] {
  const tags = new Set<string>();
  for (const row of rows.values()) {
    for (const tag of row.tags ?? []) tags.add(tag);
  }
  return Array.from(tags).sort();
}

export function getTagsByEntryId(): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const row of rows.values()) map.set(row.entryId, row.tags ?? []);
  return map;
}
