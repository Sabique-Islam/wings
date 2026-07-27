import { Extension } from "@tiptap/core";
import Suggestion from "@tiptap/suggestion";
import { wikiLinkSuggestionKey } from "./suggestionPluginKeys";
import { renderPageSuggestions } from "./PageSuggestionList";
import { matchPages, wikiLinkQuery } from "./pageSuggestions";
import type { PageOption } from "./PageMentionExtension";

/**
 * Obsidian-style `[[` page linking.
 *
 * The chosen page is inserted as an ordinary `#page:id` link mark rather than a
 * node of its own, so wikilinks reuse the existing markdown round-trip,
 * click-to-navigate handling, and link indexing with no new serialization path.
 */
export function createWikiLinkExtension(
  getPages: () => PageOption[],
  onCreatePage?: (title: string) => void,
) {
  return Extension.create({
    name: "wikiLink",
    addOptions() {
      return {
        suggestion: {
          char: "[[",
          allowSpaces: true,
          // `[[` reads as a link opener wherever it appears, including straight
          // after a word, so don't require a leading space.
          allowedPrefixes: null,
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
          items: ({ query }: { query: string }) => matchPages(getPages(), wikiLinkQuery(query)),
          render: () => {
            const renderer = renderPageSuggestions();
            const withCreate = (props: any) => ({
              ...props,
              query: wikiLinkQuery(props.query ?? ""),
              onCreate: onCreatePage
                ? (title: string) => {
                    props.editor.chain().focus().deleteRange(props.range).run();
                    onCreatePage(title);
                  }
                : undefined,
            });
            return {
              ...renderer,
              onStart: (props: any) => renderer.onStart(withCreate(props)),
              onUpdate: (props: any) => renderer.onUpdate(withCreate(props)),
            };
          },
        },
      };
    },
    addProseMirrorPlugins() {
      return [
        Suggestion({
          editor: this.editor,
          ...this.options.suggestion,
          pluginKey: wikiLinkSuggestionKey,
        }),
      ];
    },
  });
}
