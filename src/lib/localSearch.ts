// Instant workspace search over the entries already in memory (painted from
// IndexedDB), so ⌘P never waits on the network — or on the AI.

import { getEntryTitle, type Entry } from "./journal";

export interface SearchHit {
  entry: Entry;
  /** Text around the body match, only when the title didn't already match. */
  snippet: string | null;
}

const SNIPPET_RADIUS = 40;

/** Higher scores sort first; 0 means "no match". */
function score(title: string, content: string, query: string): number {
  if (title.startsWith(query)) return 4;
  if (new RegExp(`\\b${escapeRegExp(query)}`).test(title)) return 3;
  if (title.includes(query)) return 2;
  if (content.includes(query)) return 1;
  return 0;
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function snippetAround(content: string, at: number, queryLength: number): string {
  const start = Math.max(0, at - SNIPPET_RADIUS);
  const end = Math.min(content.length, at + queryLength + SNIPPET_RADIUS);
  const body = content.slice(start, end).replace(/\s+/g, " ").trim();
  return `${start > 0 ? "…" : ""}${body}${end < content.length ? "…" : ""}`;
}

export function searchLocalEntries(entries: Entry[], query: string, limit = 20): SearchHit[] {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return entries.slice(0, limit).map((entry) => ({ entry, snippet: null }));
  }

  const scored: { hit: SearchHit; rank: number; order: number }[] = [];
  entries.forEach((entry, order) => {
    const title = getEntryTitle(entry).toLowerCase();
    const content = entry.content.toLowerCase();
    const rank = score(title, content, needle);
    if (rank === 0) return;
    const bodyAt = rank === 1 ? content.indexOf(needle) : -1;
    scored.push({
      hit: {
        entry,
        snippet: bodyAt >= 0 ? snippetAround(entry.content, bodyAt, needle.length) : null,
      },
      rank,
      order,
    });
  });

  // Entries arrive newest-first, so `order` keeps recency as the tiebreaker.
  scored.sort((a, b) => b.rank - a.rank || a.order - b.order);
  return scored.slice(0, limit).map((s) => s.hit);
}
