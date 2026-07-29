// Pure link extraction over TipTap JSON.
//
// Deliberately DOM-free so the same code runs on the main thread and inside the
// link indexer worker.

import type { JSONContent } from "@tiptap/core";

const PAGE_HREF_PREFIX = "#page:";
/** `[[Title]]` typed by hand, or brought back by a markdown round-trip. */
const BARE_WIKILINK = /\[\[([^[\]|]+)(?:\|[^[\]]*)?\]\]/g;
/** `![[Title]]` embed syntax in raw markdown. */
const BARE_WIKIEMBED = /!\[\[([^[\]|]+)(?:\|[^[\]]*)?\]\]/g;
/** Obsidian-style hashtags in plain text (not inside words). */
const HASHTAG = /(?:^|[\s(])#([\w/-]+)/g;

export interface ExtractedLinks {
  /** Ids of pages this document links to, first occurrence first. */
  outgoing: string[];
  /** Wikilink titles that don't point at a page yet. */
  unresolved: string[];
  /** Lowercase-normalized hashtags found in the document. */
  tags: string[];
}

export function pageIdFromHref(href: string | null | undefined): string | null {
  if (!href?.startsWith(PAGE_HREF_PREFIX)) return null;
  const id = href.slice(PAGE_HREF_PREFIX.length).trim();
  return id || null;
}

function collectHashtags(text: string, tags: Set<string>): void {
  for (const match of text.matchAll(HASHTAG)) {
    const tag = match[1]?.trim().toLowerCase();
    if (tag) tags.add(tag);
  }
}

/** Parse `tags:` / `tag:` lines from YAML frontmatter in markdown. */
export function extractTagsFromFrontmatter(markdown: string | null | undefined): string[] {
  if (!markdown) return [];
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return [];
  const tags = new Set<string>();
  const head = match[1];
  const listMatch = head.match(/^tags:\s*\[(.+)\]\s*$/im);
  if (listMatch) {
    for (const part of listMatch[1].split(",")) {
      const tag = part.trim().replace(/^['"]|['"]$/g, "").toLowerCase();
      if (tag) tags.add(tag);
    }
  }
  const inlineMatch = head.match(/^tags:\s*(.+)\s*$/im);
  if (inlineMatch && !listMatch) {
    for (const part of inlineMatch[1].split(",")) {
      const tag = part.trim().replace(/^['"]|['"]$/g, "").toLowerCase();
      if (tag) tags.add(tag);
    }
  }
  const singleMatch = head.match(/^tag:\s*(.+)\s*$/im);
  if (singleMatch) {
    const tag = singleMatch[1].trim().replace(/^['"]|['"]$/g, "").toLowerCase();
    if (tag) tags.add(tag);
  }
  return Array.from(tags);
}

export function extractTags(
  doc: JSONContent | null | undefined,
  markdown?: string | null,
): string[] {
  const tags = new Set<string>(extractTagsFromFrontmatter(markdown));
  const visit = (node: JSONContent) => {
    if (typeof node.text === "string") collectHashtags(node.text, tags);
    for (const child of node.content ?? []) visit(child);
  };
  if (doc) visit(doc);
  return Array.from(tags).sort();
}

export function extractLinks(
  doc: JSONContent | null | undefined,
  markdown?: string | null,
): ExtractedLinks {
  const outgoing = new Set<string>();
  const unresolved = new Set<string>();

  const visit = (node: JSONContent) => {
    if (node.type === "pageEmbed") {
      const pageId = node.attrs?.pageId as string | undefined;
      if (pageId) outgoing.add(pageId);
    }
    for (const mark of node.marks ?? []) {
      if (mark.type !== "link") continue;
      const id = pageIdFromHref(mark.attrs?.href as string | undefined);
      if (id) outgoing.add(id);
    }
    if (typeof node.text === "string") {
      if (node.text.includes("[[")) {
        for (const match of node.text.matchAll(BARE_WIKILINK)) {
          const title = match[1].trim();
          if (title) unresolved.add(title);
        }
      }
      if (node.text.includes("![[")) {
        for (const match of node.text.matchAll(BARE_WIKIEMBED)) {
          const title = match[1].trim();
          if (title) unresolved.add(title);
        }
      }
    }
    for (const child of node.content ?? []) visit(child);
  };

  if (doc) visit(doc);
  if (markdown) {
    for (const match of markdown.matchAll(BARE_WIKIEMBED)) {
      const title = match[1].trim();
      if (title) unresolved.add(title);
    }
  }
  return {
    outgoing: Array.from(outgoing),
    unresolved: Array.from(unresolved),
    tags: extractTags(doc, markdown),
  };
}
