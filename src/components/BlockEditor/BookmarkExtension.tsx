import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewProps } from "@tiptap/react";
import { ExternalLink } from "lucide-react";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    bookmark: {
      insertBookmark: (attrs: { url: string; title?: string; description?: string }) => ReturnType;
    };
  }
}

function BookmarkView({ node }: NodeViewProps) {
  const { url, title, description } = node.attrs as {
    url: string;
    title: string;
    description: string;
  };
  const host = (() => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  })();

  return (
    <NodeViewWrapper className="bookmark-block" data-type="bookmark">
      <a href={url} target="_blank" rel="noopener noreferrer" className="bookmark-card" contentEditable={false}>
        <div className="bookmark-body">
          <p className="bookmark-title">{title || host}</p>
          {description ? <p className="bookmark-desc">{description}</p> : null}
          <p className="bookmark-url">{host}</p>
        </div>
        <ExternalLink className="bookmark-icon h-4 w-4 shrink-0" />
      </a>
    </NodeViewWrapper>
  );
}

export const Bookmark = Node.create({
  name: "bookmark",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      url: { default: "" },
      title: { default: "" },
      description: { default: "" },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="bookmark"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "bookmark" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(BookmarkView);
  },

  addCommands() {
    return {
      insertBookmark:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs }),
    };
  },
});
