import { Extension } from "@tiptap/core";
import Suggestion from "@tiptap/suggestion";
import { pageMentionSuggestionKey } from "./suggestionPluginKeys";
import { renderPageSuggestions } from "./PageSuggestionList";
import { matchPages } from "./pageSuggestions";

export interface PageOption {
  id: string;
  title: string;
}

export function createPageMentionExtension(getPages: () => PageOption[]) {
  return Extension.create({
    name: "pageMention",
    // Above WritingExperience (200) so Enter and the arrow keys reach the open
    // picker instead of splitting the block underneath it.
    priority: 500,
    addOptions() {
      return {
        suggestion: {
          char: "@",
          allowSpaces: true,
          command: ({ editor, range, props }: any) => {
            const page = props as PageOption;
            editor
              .chain()
              .focus()
              .deleteRange(range)
              .insertContent({
                type: "text",
                marks: [
                  {
                    type: "link",
                    attrs: { href: `#page:${page.id}`, class: "editor-link page-link" },
                  },
                ],
                text: page.title || "Untitled",
              })
              .insertContent(" ")
              .run();
          },
          items: ({ query }: { query: string }) => matchPages(getPages(), query),
          render: renderPageSuggestions,
        },
      };
    },
    addProseMirrorPlugins() {
      return [
        Suggestion({
          editor: this.editor,
          ...this.options.suggestion,
          pluginKey: pageMentionSuggestionKey,
        }),
      ];
    },
  });
}
