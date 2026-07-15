import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewProps } from "@tiptap/react";
import { isAllowedEmbedUrl, isSafeHttpUrl } from "@/lib/safeUrl";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    embed: {
      insertEmbed: (attrs: { url: string; embedUrl: string }) => ReturnType;
    };
  }
}

function EmbedView({ node }: NodeViewProps) {
  const { embedUrl, url } = node.attrs as { embedUrl: string; url: string };
  const src = embedUrl || url;

  // Only frame trusted https hosts. Anything else degrades to a plain link so
  // a malicious src (javascript:, data:, arbitrary origin) can never load.
  if (!isAllowedEmbedUrl(src)) {
    return (
      <NodeViewWrapper className="embed-block" data-type="embed">
        <div className="embed-fallback" contentEditable={false}>
          {isSafeHttpUrl(url) ? (
            <a href={url} target="_blank" rel="noopener noreferrer nofollow">
              {url}
            </a>
          ) : (
            <span>Embed blocked (untrusted source)</span>
          )}
        </div>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper className="embed-block" data-type="embed">
      <iframe
        src={src}
        title="Embed"
        frameBorder="0"
        allowFullScreen
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-presentation"
        referrerPolicy="no-referrer"
        className="embed-iframe"
        contentEditable={false}
      />
    </NodeViewWrapper>
  );
}

export const Embed = Node.create({
  name: "embed",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      url: { default: "" },
      embedUrl: { default: "" },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="embed"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "embed" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(EmbedView);
  },

  addCommands() {
    return {
      insertEmbed:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs }),
    };
  },
});
