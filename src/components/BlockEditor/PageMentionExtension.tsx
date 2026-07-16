import { Extension } from "@tiptap/core";
import { ReactRenderer } from "@tiptap/react";
import Suggestion from "@tiptap/suggestion";
import { pageMentionSuggestionKey } from "./suggestionPluginKeys";
import tippy, { Instance as TippyInstance } from "tippy.js";
import { forwardRef, useEffect, useImperativeHandle, useState, useCallback } from "react";
import { FileText } from "lucide-react";
import { fuzzyMatch } from "./blockCommands";

export interface PageOption {
  id: string;
  title: string;
}

interface PageListProps {
  items: PageOption[];
  command: (item: PageOption) => void;
}

const PageList = forwardRef<any, PageListProps>(({ items, command }, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  useEffect(() => setSelectedIndex(0), [items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (!items.length) return false;
      if (event.key === "ArrowUp") {
        setSelectedIndex((i) => (i + items.length - 1) % items.length);
        return true;
      }
      if (event.key === "ArrowDown") {
        setSelectedIndex((i) => (i + 1) % items.length);
        return true;
      }
      if (event.key === "Enter") {
        command(items[selectedIndex]!);
        return true;
      }
      return false;
    },
  }));

  if (!items.length) {
    return (
      <div className="bg-card border border-border rounded-md p-2 shadow-lg min-w-[200px]">
        <p className="text-[11px] text-muted-foreground px-2">No pages found</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg shadow-xl overflow-hidden min-w-[240px] max-h-[240px] overflow-y-auto">
      {items.map((item, index) => (
        <button
          key={item.id}
          type="button"
          onClick={() => command(item)}
          className={`flex items-center gap-2 w-full px-3 py-2 text-left text-xs ${
            index === selectedIndex ? "bg-accent" : "hover:bg-accent/50"
          }`}
        >
          <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate">{item.title || "Untitled"}</span>
        </button>
      ))}
    </div>
  );
});
PageList.displayName = "PageList";

export function createPageMentionExtension(getPages: () => PageOption[]) {
  return Extension.create({
    name: "pageMention",
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
          items: ({ query }: { query: string }) => {
            const pages = getPages();
            const q = query.trim();
            if (!q) return pages.slice(0, 12);
            return pages
              .map((p) => ({
                p,
                score: fuzzyMatch(q, p.title || "Untitled"),
              }))
              .filter(({ score }) => score > 0)
              .sort((a, b) => b.score - a.score)
              .map(({ p }) => p)
              .slice(0, 12);
          },
          render: () => {
            let component: ReactRenderer | null = null;
            let popup: TippyInstance[] | null = null;
            return {
              onStart: (props: any) => {
                component = new ReactRenderer(PageList, { props, editor: props.editor });
                if (!props.clientRect) return;
                popup = tippy("body", {
                  getReferenceClientRect: props.clientRect,
                  appendTo: () => document.body,
                  content: component.element,
                  showOnCreate: true,
                  interactive: true,
                  trigger: "manual",
                  placement: "bottom-start",
                });
              },
              onUpdate(props: any) {
                component?.updateProps(props);
                popup?.[0]?.setProps({ getReferenceClientRect: props.clientRect });
              },
              onKeyDown(props: any) {
                if (props.event.key === "Escape") {
                  popup?.[0]?.hide();
                  return true;
                }
                return (component?.ref as any)?.onKeyDown(props) ?? false;
              },
              onExit() {
                popup?.[0]?.destroy();
                component?.destroy();
              },
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
          pluginKey: pageMentionSuggestionKey,
        }),
      ];
    },
  });
}
