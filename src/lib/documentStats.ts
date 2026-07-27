// Reader-facing document stats, derived from whatever representation is freshest.

import type { JSONContent } from "@tiptap/core";

export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

/**
 * Word count straight off the editor's JSON. The typing path emits JSON long
 * before markdown exists, so this is the only representation that is current
 * while someone is still writing.
 */
export function countWordsInDoc(doc: JSONContent | null | undefined): number {
  if (!doc) return 0;
  let words = 0;
  const visit = (node: JSONContent) => {
    if (typeof node.text === "string") words += countWords(node.text);
    for (const child of node.content ?? []) visit(child);
  };
  visit(doc);
  return words;
}

export function readingTime(words: number): string {
  const mins = Math.ceil(words / 200);
  return mins < 1 ? "<1 min" : `${mins} min`;
}
