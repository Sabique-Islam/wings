import { useEditor, EditorContent } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import { markdownToHtml, htmlToMarkdown } from "@/lib/markdown";
import { looksLikeMarkdown } from "./blockCommands";
import { useCallback, useEffect, useRef } from "react";
import { Bold, Italic, Strikethrough, Underline, Code, Link as LinkIcon, Sparkles } from "lucide-react";
import { createBlockEditorExtensions } from "./editorExtensions";
import { BlockMenu } from "./BlockMenu";
import { TurnIntoDropdown, ColorDropdown } from "./ColorMenu";

interface Props {
  content: string;
  onChange: (markdown: string) => void;
  onImageUpload?: (file?: File) => void;
  onLinkPage?: () => void;
  onNewPage?: (title: string) => void;
  onAskAI?: () => void;
  editable?: boolean;
}

export function BlockEditor({ content, onChange, onImageUpload, onLinkPage, onNewPage, onAskAI, editable = true }: Props) {
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
        const text = event.clipboardData?.getData("text/plain") || "";
        if (text && looksLikeMarkdown(text) && !event.clipboardData?.getData("text/html")?.trim()) {
          event.preventDefault();
          const html = markdownToHtml(text);
          view.pasteHTML(html);
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

  useEffect(() => {
    if (editor && editor.isEditable !== editable) editor.setEditable(editable);
  }, [editable, editor]);

  useEffect(() => {
    if (!editor) return;
    if (editor.isFocused) return;
    if (content === lastEmittedMarkdown.current) return;
    if (localVersion.current !== acceptedVersion.current) return;
    editor.commands.setContent(markdownToHtml(content), { emitUpdate: false });
    lastEmittedMarkdown.current = content;
    acceptedVersion.current = localVersion.current;
  }, [content, editor]);

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

  useEffect(() => {
    if (!editor) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      if (e.key.toLowerCase() === "k" && editor.isFocused()) {
        e.preventDefault();
        setLink();
        return;
      }
      if (e.shiftKey && e.key === "s") {
        e.preventDefault();
        editor.chain().focus().toggleStrike().run();
      }
      if (e.key.toLowerCase() === "u") {
        e.preventDefault();
        editor.chain().focus().toggleUnderline().run();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [editor, setLink]);

  const insertImage = useCallback((url: string) => {
    if (!editor) return;
    editor.chain().focus().setImage({ src: url }).run();
  }, [editor]);

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
      className="block-editor-wrapper w-full min-w-0"
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
      <BlockMenu editor={editor} />
      {editor && editable && (
        <BubbleMenu editor={editor} className="bubble-menu">
          <TurnIntoDropdown editor={editor} />
          <div className="w-px h-4 bg-border mx-0.5" />
          <button
            onClick={() => (window as any).__nw_openInlineAI?.()}
            className="bubble-btn bubble-btn-ai"
            title="Ask AI"
          >
            <Sparkles className="h-3.5 w-3.5" />
          </button>
          <div className="w-px h-4 bg-border mx-0.5" />
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
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={`bubble-btn ${editor.isActive("underline") ? "is-active" : ""}`}
            title="Underline (⌘U)"
          >
            <Underline className="h-3.5 w-3.5" />
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
          <ColorDropdown editor={editor} />
        </BubbleMenu>
      )}
      <EditorContent editor={editor} className="w-full min-w-0" />
    </div>
  );
}
