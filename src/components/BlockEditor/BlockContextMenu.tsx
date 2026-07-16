import { useEffect, useState, useCallback } from "react";
import type { Editor } from "@tiptap/core";
import { turnInto, type TurnIntoType } from "./blockCommands";

interface Props {
  editor: Editor;
}

const ITEMS: { label: string; type: TurnIntoType }[] = [
  { label: "Text", type: "paragraph" },
  { label: "Heading 1", type: "heading1" },
  { label: "Heading 2", type: "heading2" },
  { label: "Heading 3", type: "heading3" },
  { label: "Bullet list", type: "bulletList" },
  { label: "Numbered list", type: "orderedList" },
  { label: "To-do list", type: "taskList" },
  { label: "Quote", type: "blockquote" },
  { label: "Code", type: "codeBlock" },
  { label: "Toggle", type: "toggle" },
  { label: "Callout", type: "callout" },
];

/** Notion-style right-click turn-into menu on the current block. */
export function BlockContextMenu({ editor }: Props) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    const el = editor.view.dom.closest(".block-editor-wrapper");
    if (!el) return;

    const onContext = (e: MouseEvent) => {
      if (!editor.isEditable) return;
      e.preventDefault();
      setPos({ x: e.clientX, y: e.clientY });
      setOpen(true);
    };
    el.addEventListener("contextmenu", onContext as EventListener);
    return () => el.removeEventListener("contextmenu", onContext as EventListener);
  }, [editor]);

  useEffect(() => {
    if (!open) return;
    const onClick = () => close();
    window.addEventListener("click", onClick);
    window.addEventListener("scroll", onClick, true);
    return () => {
      window.removeEventListener("click", onClick);
      window.removeEventListener("scroll", onClick, true);
    };
  }, [open, close]);

  if (!open) return null;

  return (
    <div
      className="fixed z-[200] min-w-[160px] rounded-md border border-border bg-popover py-1 shadow-md"
      style={{ left: pos.x, top: pos.y }}
      role="menu"
    >
      <p className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
        Turn into
      </p>
      {ITEMS.map((item) => (
        <button
          key={item.type}
          type="button"
          role="menuitem"
          className="w-full px-3 py-1.5 text-left text-xs hover:bg-muted transition-colors"
          onClick={() => {
            turnInto(editor, item.type);
            close();
          }}
        >
          {item.label}
        </button>
      ))}
      <div className="my-1 border-t border-border" />
      <button
        type="button"
        role="menuitem"
        className="w-full px-3 py-1.5 text-left text-xs text-destructive hover:bg-muted transition-colors"
        onClick={() => {
          editor.chain().focus().deleteSelection().run();
          close();
        }}
      >
        Delete block
      </button>
    </div>
  );
}
