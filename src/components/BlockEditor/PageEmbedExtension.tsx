import { useSyncExternalStore } from "react";
import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper, type NodeViewProps } from "@tiptap/react";

export interface PagePreview {
  title: string;
  preview: string;
}

// An embed card shows another page's text, so nothing about its own node tells
// React when to repaint it. Cards subscribe here and the app announces whenever
// page content changes.
let previewRevision = 0;
const previewSubscribers = new Set<() => void>();

export function refreshPageEmbeds(): void {
  previewRevision += 1;
  for (const notify of previewSubscribers) notify();
}

function subscribePageEmbeds(notify: () => void): () => void {
  previewSubscribers.add(notify);
  return () => {
    previewSubscribers.delete(notify);
  };
}

function readPreviewRevision(): number {
  return previewRevision;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    pageEmbed: {
      insertPageEmbed: (attrs: { pageId: string; title: string }) => ReturnType;
    };
  }
}

function stripMarkdownPreview(content: string, maxLen = 220): string {
  const text = content
    .replace(/^---[\s\S]*?---\n*/m, "")
    .replace(/^#+\s+/gm, "")
    .replace(/!\[\[[^\]]+\]\]/g, "")
    .replace(/\[\[[^\]]+\]\]/g, "")
    .replace(/[#*_~`>[\]()]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen).trim()}…`;
}

export function buildPagePreview(content: string, title: string): PagePreview {
  return { title, preview: stripMarkdownPreview(content) };
}

function PageEmbedView({
  node,
  getPagePreview,
}: NodeViewProps & { getPagePreview: (pageId: string) => PagePreview | null }) {
  useSyncExternalStore(subscribePageEmbeds, readPreviewRevision, readPreviewRevision);
  const { pageId, title } = node.attrs as { pageId: string; title: string };
  const resolved = pageId ? getPagePreview(pageId) : null;
  const displayTitle = resolved?.title || title || "Untitled";
  const preview = resolved?.preview ?? "";
  const missing = pageId && !resolved;

  const openPage = () => {
    if (!pageId) return;
    window.dispatchEvent(new CustomEvent("nw:navigate", { detail: pageId }));
  };

  return (
    <NodeViewWrapper className="page-embed-block" data-type="page-embed">
      <div
        className="page-embed-card rounded-lg border border-border-subtle bg-surface-0 overflow-hidden"
        contentEditable={false}
      >
        <button
          type="button"
          onClick={openPage}
          className="w-full text-left px-3 py-2 border-b border-border-subtle text-sm font-medium text-foreground hover:bg-accent-soft/40 transition-colors"
        >
          {displayTitle}
        </button>
        <div className="px-3 py-2 text-xs text-muted-foreground leading-relaxed">
          {missing ? (
            <span className="italic">Page not found</span>
          ) : preview ? (
            preview
          ) : (
            <span className="italic text-muted-foreground/60">Empty page</span>
          )}
        </div>
      </div>
    </NodeViewWrapper>
  );
}

export function createPageEmbedExtension(getPagePreview: (pageId: string) => PagePreview | null) {
  return Node.create({
    name: "pageEmbed",
    group: "block",
    atom: true,
    draggable: true,

    addOptions() {
      return { getPagePreview };
    },

    addAttributes() {
      return {
        pageId: {
          default: "",
          parseHTML: (el) => (el as HTMLElement).getAttribute("data-page-id") ?? "",
          renderHTML: (attrs) => (attrs.pageId ? { "data-page-id": attrs.pageId } : {}),
        },
        title: {
          default: "",
          parseHTML: (el) =>
            (el as HTMLElement).getAttribute("data-title") ??
            (el as HTMLElement).getAttribute("data-page-title") ??
            "",
          renderHTML: (attrs) => ({ "data-title": attrs.title }),
        },
      };
    },

    parseHTML() {
      return [{ tag: 'div[data-type="page-embed"]' }];
    },

    renderHTML({ HTMLAttributes }) {
      return ["div", mergeAttributes(HTMLAttributes, { "data-type": "page-embed" })];
    },

    addNodeView() {
      const resolvePreview = getPagePreview;
      return ReactNodeViewRenderer((props) => (
        <PageEmbedView {...props} getPagePreview={resolvePreview} />
      ));
    },

    addCommands() {
      return {
        insertPageEmbed:
          (attrs) =>
          ({ commands }) =>
            commands.insertContent({ type: this.name, attrs }),
      };
    },
  });
}

/** Standalone export for tests and type checks. */
export const PageEmbed = createPageEmbedExtension(() => null);
