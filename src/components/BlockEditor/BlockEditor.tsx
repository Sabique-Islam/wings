import { useEditor, EditorContent } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import { markdownToHtml, htmlToMarkdown } from "@/lib/markdown";
import { useCallback, useEffect, useRef } from "react";
import { Bold, Italic, Strikethrough, Code, Link as LinkIcon, Sparkles, AlignLeft, AlignCenter, AlignRight, Highlighter, Palette } from "lucide-react";
import { createBlockEditorExtensions } from "./editorExtensions";

interface Props {
  content: string;
  onChange: (markdown: string) => void;
  onImageUpload?: (file?: File) => void;
  onLinkPage?: () => void;
  onNewPage?: (title: string) => void;
  onAskAI?: () => void;
  editable?: boolean;
}

// Markdown <-> HTML conversion lives in @/lib/markdown.

export function BlockEditor({ content, onChange, onImageUpload, onLinkPage, onNewPage, onAskAI, editable = true }: Props) {
  // Snapshot initial content ONCE per mount. Parent passes `key={entry.id}`
  // so switching entries remounts the editor with fresh content. While the
  // user is typing we must NOT call `editor.setContent()` in response to
  // prop changes — that wipes cursor/selection/undo and reads to the user
  // as "text disappearing / undoing itself". Local-first: every keystroke
  // flows through onChange, the editor is the on-screen source of truth,
  // and the parent's content prop is only accepted when the editor's own
  // version has NOT advanced since the last emit (i.e. the change came from
  // outside this component).
  const initialContent = useRef(markdownToHtml(content));
  const lastEmittedMarkdown = useRef(content);
  const localVersion = useRef(0);
  const acceptedVersion = useRef(0);

  const editor = useEditor({
    extensions: createBlockEditorExtensions({ onImageUpload, onLinkPage, onNewPage, onAskAI }),
    content: initialContent.current,
    editable,
    editorProps: {
      attributes: {
        class: "block-editor-content focus:outline-none",
      },
      handleDrop: (view, event) => {
        const files = event.dataTransfer?.files;
        if (files?.length) {
          const imageFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
          if (imageFiles.length) {
            event.preventDefault();
            imageFiles.forEach((f) => onImageUpload?.(f));
            return true;
          }
        }
        return false;
      },
      handlePaste: (view, event) => {
        const items = Array.from(event.clipboardData?.items || []);
        const imageItems = items.filter((item) => item.type.startsWith("image/"));
        if (imageItems.length) {
          event.preventDefault();
          for (const item of imageItems) {
            const file = item.getAsFile();
            if (file) onImageUpload?.(file);
          }
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      localVersion.current += 1;
      const md = htmlToMarkdown(editor.getHTML());
      lastEmittedMarkdown.current = md;
      (window as any).__nw_currentMarkdown = md;
      onChange(md);
    },
  });

  // Reflect editable changes (e.g. share-role transitions) without remounting.
  useEffect(() => {
    if (editor && editor.isEditable !== editable) editor.setEditable(editable);
  }, [editable, editor]);

  // Accept external content updates ONLY if the editor hasn't advanced since
  // the last sync. If localVersion is ahead, our doc is fresher than the
  // prop — silently ignore (this prevents the debounced parent state from
  // clobbering in-flight typing, which was the "text disappears" race).
  useEffect(() => {
    if (!editor) return;
    if (editor.isFocused) return;
    if (content === lastEmittedMarkdown.current) return;
    if (localVersion.current !== acceptedVersion.current) return;
    editor.commands.setContent(markdownToHtml(content), { emitUpdate: false });
    lastEmittedMarkdown.current = content;
    acceptedVersion.current = localVersion.current;
  }, [content, editor]);


  // Keyboard shortcuts for formatting
  useEffect(() => {
    if (!editor) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;

      if (e.shiftKey && e.key === "s") {
        e.preventDefault();
        editor.chain().focus().toggleStrike().run();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [editor]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("URL", previousUrl);
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  // Method to insert image at cursor
  const insertImage = useCallback((url: string) => {
    if (!editor) return;
    editor.chain().focus().setImage({ src: url }).run();
  }, [editor]);

  // Expose insertImage on the DOM for parent to call
  useEffect(() => {
    if (!editor) return;
    (window as any).__nw_insertImage = insertImage;
    (window as any).__nw_editor = editor;
    (window as any).__nw_getMarkdown = () => htmlToMarkdown(editor.getHTML());
    (window as any).__nw_currentMarkdown = htmlToMarkdown(editor.getHTML());
    return () => {
      delete (window as any).__nw_insertImage;
      delete (window as any).__nw_editor;
      delete (window as any).__nw_getMarkdown;
      delete (window as any).__nw_currentMarkdown;
    };
  }, [insertImage, editor]);

  if (!editor) return null;

  return (
    <div
      className="block-editor-wrapper"
      onClick={(e) => {
        const target = e.target as HTMLElement;
        if (target.tagName === "A") {
          const href = target.getAttribute("href");
          if (href?.startsWith("#page:")) {
            e.preventDefault();
            const pageId = href.replace("#page:", "");
            window.dispatchEvent(new CustomEvent("nw:navigate", { detail: pageId }));
          } else if (href && !editable) {
            e.preventDefault();
            window.open(href, "_blank", "noopener,noreferrer");
          }
        }
      }}
    >
      {editor && editable && (
        <BubbleMenu
          editor={editor}
          className="bubble-menu"
        >
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`bubble-btn ${editor.isActive("bold") ? "is-active" : ""}`}
            title="Bold (⌘B)"
          >
            <Bold className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`bubble-btn ${editor.isActive("italic") ? "is-active" : ""}`}
            title="Italic (⌘I)"
          >
            <Italic className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={`bubble-btn ${editor.isActive("strike") ? "is-active" : ""}`}
            title="Strikethrough (⌘⇧S)"
          >
            <Strikethrough className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleCode().run()}
            className={`bubble-btn ${editor.isActive("code") ? "is-active" : ""}`}
            title="Inline code (⌘E)"
          >
            <Code className="h-3.5 w-3.5" />
          </button>
          <div className="w-px h-4 bg-border mx-0.5" />
          <button
            onClick={setLink}
            className={`bubble-btn ${editor.isActive("link") ? "is-active" : ""}`}
            title="Link (⌘K)"
          >
            <LinkIcon className="h-3.5 w-3.5" />
          </button>
          <div className="w-px h-4 bg-border mx-0.5" />
          <button onClick={() => editor.chain().focus().setTextAlign("left").run()} className={`bubble-btn ${editor.isActive({ textAlign: "left" }) ? "is-active" : ""}`} title="Align left"><AlignLeft className="h-3.5 w-3.5" /></button>
          <button onClick={() => editor.chain().focus().setTextAlign("center").run()} className={`bubble-btn ${editor.isActive({ textAlign: "center" }) ? "is-active" : ""}`} title="Align center"><AlignCenter className="h-3.5 w-3.5" /></button>
          <button onClick={() => editor.chain().focus().setTextAlign("right").run()} className={`bubble-btn ${editor.isActive({ textAlign: "right" }) ? "is-active" : ""}`} title="Align right"><AlignRight className="h-3.5 w-3.5" /></button>
          <div className="w-px h-4 bg-border mx-0.5" />
          <label className="bubble-btn cursor-pointer" title="Text color">
            <Palette className="h-3.5 w-3.5" />
            <input
              type="color"
              onInput={(e) => editor.chain().focus().setColor((e.target as HTMLInputElement).value).run()}
              className="sr-only"
            />
          </label>
          <label className="bubble-btn cursor-pointer" title="Highlight">
            <Highlighter className="h-3.5 w-3.5" />
            <input
              type="color"
              onInput={(e) => editor.chain().focus().toggleHighlight({ color: (e.target as HTMLInputElement).value }).run()}
              className="sr-only"
            />
          </label>
          <select
            onChange={(e) => {
              const v = e.target.value;
              if (!v) editor.chain().focus().unsetFontFamily().run();
              else editor.chain().focus().setFontFamily(v).run();
            }}
            defaultValue=""
            className="bubble-btn bg-transparent text-[10px] font-mono outline-none cursor-pointer"
            title="Font family"
          >
            <option value="">font</option>
            <option value="ui-monospace, JetBrains Mono, monospace">mono</option>
            <option value="ui-sans-serif, Inter, system-ui, sans-serif">sans</option>
            <option value="ui-serif, Georgia, serif">serif</option>
          </select>
          <button
            onClick={() => (window as any).__nw_openInlineAI?.()}
            className="bubble-btn bubble-btn-ai"
            title="Ask AI"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span className="ml-1 text-[10px]">AI</span>
          </button>
        </BubbleMenu>
      )}
      <EditorContent editor={editor} />
    </div>
  );
}
