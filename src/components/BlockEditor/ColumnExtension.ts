import { Node, mergeAttributes } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    columnList: {
      insertColumnList: (count?: 2 | 3) => ReturnType;
    };
  }
}

export const Column = Node.create({
  name: "column",
  content: "block+",
  isolating: true,

  parseHTML() {
    return [{ tag: 'div[data-type="column"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "column", class: "nw-col" }), 0];
  },
});

export const ColumnList = Node.create({
  name: "columnList",
  group: "block",
  content: "column+",
  defining: true,

  addAttributes() {
    return {
      cols: {
        default: 2,
        parseHTML: (el) => parseInt(el.getAttribute("data-cols") || "2", 10),
        renderHTML: (attrs) => ({ "data-cols": String(attrs.cols) }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="column-list"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    const cols = HTMLAttributes["data-cols"] || "2";
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "column-list",
        "data-cols": cols,
        class: `nw-column-list nw-cols-${cols}`,
      }),
      0,
    ];
  },

  addCommands() {
    return {
      insertColumnList:
        (count: 2 | 3 = 2) =>
        ({ commands }) => {
          const cols = Array.from({ length: count }, () => ({
            type: "column",
            content: [{ type: "paragraph" }],
          }));
          return commands.insertContent({ type: this.name, attrs: { cols: count }, content: cols });
        },
    };
  },
});
