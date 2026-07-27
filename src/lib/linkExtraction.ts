// Pure link extraction over TipTap JSON.
//
// Deliberately DOM-free so the same code runs on the main thread and inside the
// link indexer worker.

import type { JSONContent } from "@tiptap/core";

const PAGE_HREF_PREFIX = "#page:";
/** `[[Title]]` typed by hand, or brought back by a markdown round-trip. */
const BARE_WIKILINK = /\[\[([^[\]|]+)(?:\|[^[\]]*)?\]\]/g;

export interface ExtractedLinks {
  /** Ids of pages this document links to, first occurrence first. */
  outgoing: string[];
  /** Wikilink titles that don't point at a page yet. */
  unresolved: string[];
}

export function pageIdFromHref(href: string | null | undefined): string | null {
  if (!href?.startsWith(PAGE_HREF_PREFIX)) return null;
  const id = href.slice(PAGE_HREF_PREFIX.length).trim();
  return id || null;
}

export function extractLinks(doc: JSONContent | null | undefined): ExtractedLinks {
  const outgoing = new Set<string>();
  const unresolved = new Set<string>();

  const visit = (node: JSONContent) => {
    for (const mark of node.marks ?? []) {
      if (mark.type !== "link") continue;
      const id = pageIdFromHref(mark.attrs?.href as string | undefined);
      if (id) outgoing.add(id);
    }
    if (typeof node.text === "string" && node.text.includes("[[")) {
      for (const match of node.text.matchAll(BARE_WIKILINK)) {
        const title = match[1].trim();
        if (title) unresolved.add(title);
      }
    }
    for (const child of node.content ?? []) visit(child);
  };

  if (doc) visit(doc);
  return { outgoing: Array.from(outgoing), unresolved: Array.from(unresolved) };
}
