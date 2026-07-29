import { Extension } from "@tiptap/core";
import Suggestion from "@tiptap/suggestion";
import { wikiEmbedSuggestionKey } from "./suggestionPluginKeys";
import { renderPageSuggestions } from "./PageSuggestionList";
import { matchPages, wikiLinkQuery } from "./pageSuggestions";
import type { PageOption } from "./PageMentionExtension";

/**
 * Obsidian-style `![[` page transclusion.
 *
 * Inserts a read-only pageEmbed block that previews cached page content.
 */
export function createWikiEmbedExtension(
  getPages: () => PageOption[],
  onCreatePage?: (title: string) => void,
) {
  return Extension.create({
    name: "wikiEmbed",
    priority: 500,
    addOptions() {
      return {
        suggestion: {
          char: "![[",
          allowSpaces: true,
          allowedPrefixes: null,
          command: ({ editor, range, props }: any) => {
            const page = props as PageOption;
            editor
              .chain()
              .focus()
              .deleteRange(range)
              .insertContent({
                type: "pageEmbed",
                attrs: { pageId: page.id, title: page.title || "Untitled" },
              })
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
          pluginKey: wikiEmbedSuggestionKey,
        }),
      ];
    },
  });
}
