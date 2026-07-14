import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewContent, NodeViewProps } from "@tiptap/react";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    callout: {
      setCallout: (attrs?: { emoji?: string; bgColor?: string }) => ReturnType;
      toggleCallout: () => ReturnType;
    };
  }
}

const CALLOUT_COLORS = [
  { label: "Default", value: "" },
  { label: "Gray", value: "rgba(241,241,239,0.5)" },
  { label: "Blue", value: "rgba(231,243,248,0.6)" },
  { label: "Green", value: "rgba(237,243,236,0.6)" },
  { label: "Yellow", value: "rgba(251,243,219,0.6)" },
  { label: "Red", value: "rgba(253,235,236,0.6)" },
];

function CalloutView({ node, updateAttributes }: NodeViewProps) {
  const emoji = (node.attrs.emoji as string) || "💡";
  const bgColor = (node.attrs.bgColor as string) || "";

  const pickEmoji = () => {
    const next = window.prompt("Emoji", emoji);
    if (next != null && next.trim()) updateAttributes({ emoji: next.trim() });
  };

  return (
    <NodeViewWrapper
      className="callout-block"
      data-type="callout"
      data-emoji={emoji}
      style={bgColor ? { backgroundColor: bgColor } : undefined}
    >
      <button type="button" className="callout-emoji" onClick={pickEmoji} contentEditable={false}>
        {emoji}
      </button>
      <div className="callout-content">
        <NodeViewContent />
      </div>
    </NodeViewWrapper>
  );
}

export const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      emoji: {
        default: "💡",
        parseHTML: (el) => el.getAttribute("data-emoji") || "💡",
        renderHTML: (attrs) => ({ "data-emoji": attrs.emoji }),
      },
      bgColor: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-bg-color") || "",
        renderHTML: (attrs) => (attrs.bgColor ? { "data-bg-color": attrs.bgColor } : {}),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="callout"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "callout", class: "callout-block" }), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CalloutView);
  },

  addCommands() {
    return {
      setCallout:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { emoji: attrs?.emoji ?? "💡", bgColor: attrs?.bgColor ?? "" },
            content: [{ type: "paragraph" }],
          }),
      toggleCallout:
        () =>
        ({ commands }) =>
          commands.toggleWrap(this.name),
    };
  },
});

export { CALLOUT_COLORS };
