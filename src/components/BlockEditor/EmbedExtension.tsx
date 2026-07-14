import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewProps } from "@tiptap/react";

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

  return (
    <NodeViewWrapper className="embed-block" data-type="embed">
      <iframe
        src={src}
        title="Embed"
        frameBorder="0"
        allowFullScreen
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
