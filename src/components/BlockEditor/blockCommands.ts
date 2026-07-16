import type { Editor } from "@tiptap/core";
import { markdownToHtml } from "@/lib/markdown";
import { isAllowedEmbedUrl, isSafeHttpUrl } from "@/lib/safeUrl";

export const TEXT_COLORS = [
  { label: "Default", value: "" },
  { label: "Gray", value: "#9b9a97" },
  { label: "Brown", value: "#64473a" },
  { label: "Orange", value: "#d9730d" },
  { label: "Yellow", value: "#dfab01" },
  { label: "Green", value: "#0f7b6c" },
  { label: "Blue", value: "#0b6e99" },
  { label: "Purple", value: "#6940a5" },
  { label: "Pink", value: "#ad1a72" },
  { label: "Red", value: "#e03e3e" },
];

export const BG_COLORS = [
  { label: "Default", value: "" },
  { label: "Gray", value: "#f1f1ef" },
  { label: "Brown", value: "#f4eeee" },
  { label: "Orange", value: "#fbecdd" },
  { label: "Yellow", value: "#fbf3db" },
  { label: "Green", value: "#edf3ec" },
  { label: "Blue", value: "#e7f3f8" },
  { label: "Purple", value: "#f6f3f9" },
  { label: "Pink", value: "#faf1f5" },
  { label: "Red", value: "#fdebec" },
];

export type TurnIntoType =
  | "paragraph"
  | "heading1"
  | "heading2"
  | "heading3"
  | "bulletList"
  | "orderedList"
  | "taskList"
  | "blockquote"
  | "codeBlock"
  | "toggle"
  | "callout";

/** Shared turn-into menu items for bubble, block, and context menus. */
export const TURN_INTO_ITEMS: { label: string; type: TurnIntoType }[] = [
  { label: "Text", type: "paragraph" },
  { label: "Heading 1", type: "heading1" },
  { label: "Heading 2", type: "heading2" },
  { label: "Heading 3", type: "heading3" },
  { label: "Bullet list", type: "bulletList" },
  { label: "Numbered list", type: "orderedList" },
  { label: "To-do list", type: "taskList" },
  { label: "Quote", type: "blockquote" },
  { label: "Code", type: "codeBlock" },
  { label: "Toggle", type: "toggle" },
  { label: "Callout", type: "callout" },
];

export function turnInto(editor: Editor, type: TurnIntoType): boolean {
  const chain = editor.chain().focus();
  switch (type) {
    case "paragraph":
      return chain.setParagraph().run();
    case "heading1":
      return chain.setHeading({ level: 1 }).run();
    case "heading2":
      return chain.setHeading({ level: 2 }).run();
    case "heading3":
      return chain.setHeading({ level: 3 }).run();
    case "bulletList":
      return chain.toggleBulletList().run();
    case "orderedList":
      return chain.toggleOrderedList().run();
    case "taskList":
      return chain.toggleTaskList().run();
    case "blockquote":
      return chain.setBlockquote().run();
    case "codeBlock":
      return chain.setCodeBlock().run();
    case "toggle":
      return chain.setToggleBlock().run();
    case "callout":
      return chain.setCallout().run();
    default:
      return false;
  }
}

export function insertColumns(editor: Editor, count: 2 | 3): void {
  const cols = Array.from({ length: count }, () => ({
    type: "column",
    content: [{ type: "paragraph" }],
  }));
  editor.chain().focus().insertContent({ type: "columnList", content: cols }).run();
}

export function insertBookmark(
  editor: Editor,
  url: string,
  meta?: { title?: string; description?: string; favicon?: string },
): boolean {
  if (!isSafeHttpUrl(url)) return false;
  let title = meta?.title || url;
  if (!meta?.title) {
    try {
      title = new URL(url).hostname;
    } catch {
      /* keep url */
    }
  }
  return editor
    .chain()
    .focus()
    .insertBookmark({
      url,
      title,
      description: meta?.description ?? "",
      favicon: meta?.favicon ?? "",
    })
    .run();
}

export function insertEmbed(editor: Editor, url: string): boolean {
  let embedUrl = url;
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  if (ytMatch) embedUrl = `https://www.youtube.com/embed/${ytMatch[1]}`;
  // Reject anything not on the https embed allowlist so unsupported/hostile
  // URLs never reach the iframe node.
  if (!isAllowedEmbedUrl(embedUrl)) return false;
  return editor.chain().focus().insertEmbed({ url, embedUrl }).run();
}

export function insertTemplateMarkdown(editor: Editor, markdown: string): void {
  editor.chain().focus().insertContent(markdownToHtml(markdown)).run();
}

/** Simple fuzzy score — higher is better. */
export function fuzzyMatch(query: string, text: string, aliases: string[] = []): number {
  const q = query.toLowerCase().trim();
  if (!q) return 1;
  const targets = [text, ...aliases].map((t) => t.toLowerCase());
  for (const t of targets) {
    if (t === q) return 100;
    if (t.startsWith(q)) return 80;
    if (t.includes(q)) return 60;
    // subsequence
    let qi = 0;
    for (let i = 0; i < t.length && qi < q.length; i++) {
      if (t[i] === q[qi]) qi++;
    }
    if (qi === q.length) return 40;
  }
  return 0;
}

export function looksLikeMarkdown(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  return (
    /^#{1,6}\s/m.test(t) ||
    /^\s*[-*+]\s/m.test(t) ||
    /^\s*\d+\.\s/m.test(t) ||
    /```/.test(t) ||
    /\*\*[^*]+\*\*/.test(t) ||
    /^>\s/m.test(t) ||
    /^\s*-\s\[[ x]\]/m.test(t)
  );
}
