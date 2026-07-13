// Markdown <-> HTML conversion used by the block editor.
// We deliberately do NOT use the `tiptap-markdown` extension because at the
// time of writing it overrides node behavior in ways that break basic editing
// (e.g. Enter creating new paragraphs, inline input rules). Instead we keep
// a clean separation: markdown is converted to HTML at load time with
// `marked`, and HTML is converted back to markdown at save time with
// `turndown`, with a few custom rules for our atom nodes.

import { marked } from "marked";
import TurndownService from "turndown";

// -- HTML -> Markdown (save) -------------------------------------------------
const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  bulletListMarker: "-",
  emDelimiter: "_",
});

// Task lists
turndown.addRule("taskList", {
  filter: (node) =>
    node.nodeName === "LI" &&
    (node as HTMLElement).getAttribute("data-type") === "taskItem",
  replacement(_content, node) {
    const checked = (node as HTMLElement).getAttribute("data-checked") === "true";
    const text = (node as HTMLElement).innerText.trim();
    return `- [${checked ? "x" : " "}] ${text}\n`;
  },
});

// Highlight / mark
turndown.addRule("highlight", {
  filter: ["mark"],
  replacement: (content) => `==${content}==`,
});

// Excalidraw atom — preserve the HTML so parseHTML can recover it on load.
turndown.addRule("excalidraw", {
  filter: (node) =>
    node.nodeName === "DIV" &&
    (node as HTMLElement).getAttribute("data-type") === "excalidraw",
  replacement: (_content, node) => `\n\n${(node as HTMLElement).outerHTML}\n\n`,
});

// Inline / block math nodes rendered by MathExtension
turndown.addRule("inlineMath", {
  filter: (node) =>
    node.nodeName === "SPAN" &&
    (node as HTMLElement).getAttribute("data-type") === "inline-math",
  replacement: (_c, node) => {
    const latex = (node as HTMLElement).getAttribute("data-latex") || "";
    return `$${latex}$`;
  },
});
turndown.addRule("blockMath", {
  filter: (node) =>
    node.nodeName === "DIV" &&
    (node as HTMLElement).getAttribute("data-type") === "block-math",
  replacement: (_c, node) => {
    const latex = (node as HTMLElement).getAttribute("data-latex") || "";
    return `\n\n$$\n${latex}\n$$\n\n`;
  },
});

export function htmlToMarkdown(html: string): string {
  return turndown.turndown(html || "").trim();
}

// -- Markdown -> HTML (load) -------------------------------------------------
marked.setOptions({ gfm: true, breaks: false });

/** Convert $$...$$ and $...$ in markdown into the math extension's HTML
 *  so the editor's parser can pick them up. Skips fenced code blocks. */
function preprocessMath(md: string): string {
  if (!md) return md;
  const fenceRe = /(^|\n)```[\s\S]*?\n```/g;
  let last = 0;
  const segs: { text: string; isCode: boolean }[] = [];
  let m: RegExpExecArray | null;
  while ((m = fenceRe.exec(md)) !== null) {
    if (m.index > last) segs.push({ text: md.slice(last, m.index), isCode: false });
    segs.push({ text: m[0], isCode: true });
    last = m.index + m[0].length;
  }
  if (last < md.length) segs.push({ text: md.slice(last), isCode: false });

  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  return segs.map((seg) => {
    if (seg.isCode) return seg.text;
    let text = seg.text;
    text = text.replace(/\$\$([\s\S]+?)\$\$/g, (_f, latex) =>
      `\n\n<div data-type="block-math" data-latex="${esc(String(latex).trim())}"></div>\n\n`
    );
    text = text.replace(/(^|[^\\$])\$([^\n$]+?)\$(?!\d)/g, (_f, pre, latex) =>
      `${pre}<span data-type="inline-math" data-latex="${esc(String(latex).trim())}"></span>`
    );
    return text;
  }).join("");
}

export function markdownToHtml(md: string): string {
  if (!md) return "";
  return marked.parse(preprocessMath(md), { async: false }) as string;
}
