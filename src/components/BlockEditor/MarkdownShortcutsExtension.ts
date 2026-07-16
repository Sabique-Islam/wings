import { Extension, wrappingInputRule } from "@tiptap/core";

/** Notion-style markdown typing shortcuts beyond StarterKit defaults. */
export const MarkdownShortcuts = Extension.create({
  name: "markdownShortcuts",
  priority: 150,

  addInputRules() {
    const { taskList, callout } = this.editor.schema.nodes;
    return [
      wrappingInputRule({
        find: /^\[\s?\]\s$/,
        type: taskList,
      }),
      wrappingInputRule({
        find: /^>\s$/,
        type: callout,
      }),
    ];
  },
});
