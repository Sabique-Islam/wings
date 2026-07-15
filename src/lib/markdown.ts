// Markdown <-> HTML conversion used by the block editor.

import { marked } from "marked";
import TurndownService from "turndown";

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  bulletListMarker: "-",
  emDelimiter: "_",
});

const CUSTOM_BLOCK_TYPES = new Set(["callout", "toggle", "column-list", "bookmark", "embed", "excalidraw"]);
turndown.keep((node) => {
  if (node.nodeType !== 1) return false;
  const type = (node as HTMLElement).getAttribute("data-type");
  return !!type && CUSTOM_BLOCK_TYPES.has(type);
});

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

turndown.addRule("highlight", {
  filter: ["mark"],
  replacement: (content) => `==${content}==`,
});

turndown.addRule("underline", {
  filter: ["u"],
  replacement: (content) => `<u>${content}</u>`,
});

// Passthrough custom blocks as HTML blobs
function passthroughRule(name: string, test: (el: HTMLElement) => boolean) {
  turndown.addRule(name, {
    filter: (node) => node.nodeType === 1 && test(node as HTMLElement),
    replacement: (_c, node) => `\n\n${(node as HTMLElement).outerHTML}\n\n`,
  });
}

passthroughRule("excalidraw", (el) => el.getAttribute("data-type") === "excalidraw");
passthroughRule("callout", (el) => el.getAttribute("data-type") === "callout");
passthroughRule("toggle", (el) => el.getAttribute("data-type") === "toggle");
passthroughRule("columnList", (el) => el.getAttribute("data-type") === "column-list");
passthroughRule("bookmark", (el) => el.getAttribute("data-type") === "bookmark");
passthroughRule("embed", (el) => el.getAttribute("data-type") === "embed");

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

// Preserve inline styles for color/align
turndown.addRule("styledSpan", {
  filter: (node) => {
    if (node.nodeName !== "SPAN") return false;
    const el = node as HTMLElement;
    return !!(el.getAttribute("style") || el.style.color);
  },
  replacement: (content, node) => (node as HTMLElement).outerHTML.replace(content, content),
});

export function htmlToMarkdown(html: string): string {
  if (!html) return "";
  const input = html.trim().startsWith("<") ? `<div data-root="1">${html}</div>` : html;
  return turndown.turndown(input).trim();
}

marked.setOptions({ gfm: true, breaks: false });

// Defense-in-depth: treat raw HTML in markdown as plain text so <script> and
// event-handler attributes never pass through marked into the editor pipeline.
marked.use({
  walkTokens(token) {
    if (token.type === "html") {
      const raw = (token as { raw?: string }).raw ?? "";
      (token as { type: string }).type = "text";
      (token as { text: string }).text = raw
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    }
  },
});

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

  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  return segs
    .map((seg) => {
      if (seg.isCode) return seg.text;
      let text = seg.text;
      text = text.replace(/\$\$([\s\S]+?)\$\$/g, (_f, latex) =>
        `\n\n<div data-type="block-math" data-latex="${esc(String(latex).trim())}"></div>\n\n`,
      );
      text = text.replace(/(^|[^\\$])\$([^\n$]+?)\$(?!\d)/g, (_f, pre, latex) =>
        `${pre}<span data-type="inline-math" data-latex="${esc(String(latex).trim())}"></span>`,
      );
      return text;
    })
    .join("");
}

export function markdownToHtml(md: string): string {
  if (!md) return "";
  return marked.parse(preprocessMath(md), { async: false }) as string;
}
