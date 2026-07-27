// Moving blocks out of a document: to a brand new page, or to another page.

import { getHTMLFromFragment, type Editor } from "@tiptap/core";
import { Fragment } from "@tiptap/pm/model";
import { htmlToMarkdown } from "@/lib/markdown";

/** Markdown for a set of top-level blocks, always in document order. */
export function blocksToMarkdown(editor: Editor, positions: number[]): string {
  const nodes = [...positions]
    .sort((a, b) => a - b)
    .map((pos) => editor.state.doc.nodeAt(pos))
    .filter((node): node is NonNullable<typeof node> => node != null);
  if (nodes.length === 0) return "";
  const fragment = Fragment.fromArray(nodes as Parameters<typeof Fragment.fromArray>[0]);
  return htmlToMarkdown(getHTMLFromFragment(fragment, editor.schema));
}

/** First line of text in the blocks, used to title the page they become. */
export function blocksToTitle(editor: Editor, positions: number[]): string {
  for (const pos of [...positions].sort((a, b) => a - b)) {
    const node = editor.state.doc.nodeAt(pos);
    const text = node?.textContent.trim();
    if (text) return text.slice(0, 100);
  }
  return "Untitled";
}

/**
 * Permalink to a block on the page currently open, resolved on load by the
 * `UniqueID` attribute the editor already stamps onto every block.
 */
export function blockLink(blockId: string): string {
  const { origin, pathname } = window.location;
  return `${origin}${pathname}#block=${blockId}`;
}

/** The `id` attribute `UniqueID` assigns, if this block has one. */
export function blockIdAt(editor: Editor, pos: number): string | null {
  const id = editor.state.doc.nodeAt(pos)?.attrs?.id;
  return typeof id === "string" && id ? id : null;
}
