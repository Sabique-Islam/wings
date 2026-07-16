import { useEditorState } from "@tiptap/react";
import type { Editor } from "@tiptap/core";
import { BubbleMenu } from "@tiptap/react/menus";
import { Bold, Italic, Strikethrough, Underline, Code, Link as LinkIcon, Sparkles } from "lucide-react";
import { TurnIntoDropdown, ColorDropdown } from "./ColorMenu";

interface Props {
  editor: Editor;
  onSetLink: () => void;
}

/** Bubble toolbar — subscribes only to mark state, not every transaction. */
export function BubbleMenuToolbar({ editor, onSetLink }: Props) {
  const marks = useEditorState({
    editor,
    selector: ({ editor: ed }) => ({
      bold: ed.isActive("bold"),
      italic: ed.isActive("italic"),
      underline: ed.isActive("underline"),
      strike: ed.isActive("strike"),
      code: ed.isActive("code"),
      link: ed.isActive("link"),
    }),
  });

  return (
    <BubbleMenu editor={editor} className="bubble-menu">
      <TurnIntoDropdown editor={editor} />
      <div className="w-px h-4 bg-border mx-0.5" />
      <button
        onClick={() => (window as any).__nw_openInlineAI?.()}
        className="bubble-btn bubble-btn-ai"
        title="Ask AI"
        type="button"
      >
        <Sparkles className="h-3.5 w-3.5" />
      </button>
      <div className="w-px h-4 bg-border mx-0.5" />
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`bubble-btn ${marks.bold ? "is-active" : ""}`}
        title="Bold (⌘B)"
      >
        <Bold className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`bubble-btn ${marks.italic ? "is-active" : ""}`}
        title="Italic (⌘I)"
      >
        <Italic className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={`bubble-btn ${marks.underline ? "is-active" : ""}`}
        title="Underline (⌘U)"
      >
        <Underline className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        className={`bubble-btn ${marks.strike ? "is-active" : ""}`}
        title="Strikethrough (⌘⇧S)"
      >
        <Strikethrough className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleCode().run()}
        className={`bubble-btn ${marks.code ? "is-active" : ""}`}
        title="Inline code (⌘E)"
      >
        <Code className="h-3.5 w-3.5" />
      </button>
      <div className="w-px h-4 bg-border mx-0.5" />
      <button
        type="button"
        onClick={onSetLink}
        className={`bubble-btn ${marks.link ? "is-active" : ""}`}
        title="Link (⌘K)"
      >
        <LinkIcon className="h-3.5 w-3.5" />
      </button>
      <ColorDropdown editor={editor} />
    </BubbleMenu>
  );
}
