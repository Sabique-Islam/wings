/**
 * Build initial Yjs state from entry columns when content_yjs is empty.
 */
import { getSchema } from "@tiptap/core";
import { prosemirrorJSONToYDoc } from "@tiptap/y-tiptap";
import * as Y from "yjs";
import type { JSONContent } from "@tiptap/core";
import { getSeedExtensions } from "./seedExtensions.ts";

export function isEmptyJsonDoc(json: unknown): boolean {
  if (!json || typeof json !== "object") return true;
  const doc = json as { type?: string; content?: unknown[] };
  if (doc.type !== "doc") return true;
  if (!doc.content?.length) return true;
  if (
    doc.content.length === 1 &&
    (doc.content[0] as { type?: string; content?: unknown[] })?.type === "paragraph"
  ) {
    const inner = (doc.content[0] as { content?: unknown[] }).content;
    return !inner?.length;
  }
  return false;
}

/** Minimal markdown → doc for seed when only content column survived. */
export function markdownToSeedDoc(markdown: string): JSONContent {
  const text = markdown.trim();
  if (!text) return { type: "doc", content: [] };

  const blocks: JSONContent[] = [];
  for (const chunk of text.split(/\n\n+/)) {
    const line = chunk.trim();
    if (!line) continue;
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      blocks.push({
        type: "heading",
        attrs: { level: heading[1].length },
        content: [{ type: "text", text: heading[2] }],
      });
      continue;
    }
    blocks.push({
      type: "paragraph",
      content: [{ type: "text", text: line.replace(/\n/g, " ") }],
    });
  }

  return { type: "doc", content: blocks.length ? blocks : [{ type: "paragraph" }] };
}

/**
 * Encode Yjs update from content_json (preferred) or markdown fallback.
 * Returns null when there is nothing to seed.
 */
export function seedStateFromEntry(content: string, contentJson: unknown): Uint8Array | null {
  const extensions = getSeedExtensions();
  let json: JSONContent | null = null;

  if (contentJson && !isEmptyJsonDoc(contentJson)) {
    json = contentJson as JSONContent;
  } else if (content.trim()) {
    json = markdownToSeedDoc(content);
    if (isEmptyJsonDoc(json)) return null;
  }

  if (!json) return null;

  try {
    const schema = getSchema(extensions);
    const ydoc = prosemirrorJSONToYDoc(schema, json);
    return Y.encodeStateAsUpdate(ydoc);
  } catch (err) {
    console.error("collab: seed from entry failed", err);
    return null;
  }
}
