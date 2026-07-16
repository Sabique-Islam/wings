import { useEditor, EditorContent } from "@tiptap/react";
import type { JSONContent } from "@tiptap/core";
import { markdownToHtml, htmlToMarkdown } from "@/lib/markdown";
import { insertBookmark, insertEmbed, looksLikeMarkdown } from "./blockCommands";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { createBlockEditorExtensions } from "./editorExtensions";
import { BlockMenu } from "./BlockMenu";
import { BlockContextMenu } from "./BlockContextMenu";
import { BlockActionMenu } from "./BlockActionMenu";
import { BubbleMenuToolbar } from "./BubbleMenuToolbar";
import { TableMenu } from "./TableMenu";
import { EditorPopoverInput, promptEditorInput } from "./EditorPopoverInput";
import { isSafeHttpUrl } from "@/lib/safeUrl";
import { fetchLinkPreview } from "@/lib/linkPreview";
import type { EditorChangePayload } from "@/lib/editorPayload";
import { createCollabExtensions } from "@/lib/collab/collabExtensions";
import type { CollabSession } from "@/lib/collab/useCollabProvider";
import type { PageOption } from "./PageMentionExtension";
import { toast } from "sonner";
import { Fragment, Slice } from "@tiptap/pm/model";

const SERIALIZE_DEBOUNCE_MS = 200;
const URL_ONLY = /^https?:\/\/[^\s]+$/i;

interface Props {
  content: string;
  contentJson?: JSONContent | null;
  onChange: (payload: EditorChangePayload) => void;
  onImageUpload?: (file?: File) => void;
  onLinkPage?: () => void;
  onNewPage?: (title: string) => void;
  onAskAI?: () => void;
  pages?: PageOption[];
  editable?: boolean;
  collabSession?: CollabSession | null;
}

function resolveInitialContent(content: string, contentJson?: JSONContent | null): string | JSONContent {
  if (contentJson && typeof contentJson === "object" && contentJson.type === "doc") {
    return contentJson;
  }
  return markdownToHtml(content);
}

function pastePlainParagraphs(view: import("@tiptap/pm/view").EditorView, text: string): boolean {
  const lines = text.split(/\r?\n/);
  if (lines.length <= 1) return false;
  const { schema } = view.state;
  const nodes = lines.map((line) =>
    schema.nodes.paragraph.create(null, line ? schema.text(line) : undefined),
  );
  // Fragment.from expects nodes from the same schema instance as view.state.doc
  const fragment = Fragment.from(nodes as Parameters<typeof Fragment.from>[0]);
  const tr = view.state.tr.replaceSelection(new Slice(fragment, 0, 0));
  view.dispatch(tr);
  return true;
}

export function BlockEditor({
  content,
  contentJson,
  onChange,
  onImageUpload,
  onLinkPage,
  onNewPage,
  onAskAI,
  pages = [],
  editable = true,
  collabSession = null,
}: Props) {
  const initialContent = useRef(resolveInitialContent(content, contentJson));
  const lastEmittedMarkdown = useRef(content);
  const lastEmittedJson = useRef<JSONContent | null>(contentJson ?? null);
  const localVersion = useRef(0);
  const acceptedVersion = useRef(0);
  const serializeTimer = useRef<ReturnType<typeof setTimeout>>();
  const onChangeRef = useRef(onChange);
  const pagesRef = useRef(pages);
  pagesRef.current = pages;
  onChangeRef.current = onChange;

  const extraExtensions = useMemo(
    () =>
      collabSession
        ? createCollabExtensions(collabSession.ydoc, collabSession.provider, collabSession.user)
        : [],
    [collabSession],
  );

  const extensions = useMemo(
    () =>
      createBlockEditorExtensions({
        onImageUpload,
        onLinkPage,
        onNewPage,
        onAskAI,
        getPages: pages.length > 0 ? () => pagesRef.current : undefined,
        collab: !!collabSession,
        extraExtensions,
      }),
    [
      collabSession,
      extraExtensions,
      onAskAI,
      onImageUpload,
      onLinkPage,
      onNewPage,
      pages.length,
    ],
  );

  const serialize = useCallback((editor: NonNullable<ReturnType<typeof useEditor>>, immediate = false) => {
    const run = () => {
      const md = htmlToMarkdown(editor.getHTML());
      const json = editor.getJSON();
      lastEmittedMarkdown.current = md;
      lastEmittedJson.current = json;
      (window as any).__nw_currentMarkdown = md;
      onChangeRef.current({ markdown: md, json });
    };
    if (immediate) {
      if (serializeTimer.current) clearTimeout(serializeTimer.current);
      run();
      return;
    }
    if (serializeTimer.current) clearTimeout(serializeTimer.current);
    serializeTimer.current = setTimeout(run, SERIALIZE_DEBOUNCE_MS);
  }, []);

  const editor = useEditor({
    extensions,
    content: initialContent.current,
    editable,
    shouldRerenderOnTransaction: false,
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

        const html = event.clipboardData?.getData("text/html")?.trim() ?? "";
        const text = event.clipboardData?.getData("text/plain")?.trim() ?? "";

        if (text && URL_ONLY.test(text) && isSafeHttpUrl(text)) {
          event.preventDefault();
          void (async () => {
            const meta = await fetchLinkPreview(text);
            const ed = (window as any).__nw_editor;
            if (ed) insertBookmark(ed, text, meta ?? undefined);
          })();
          return true;
        }

        if (html && html.includes("<")) {
          event.preventDefault();
          view.pasteHTML(html);
          return true;
        }

        if (text && looksLikeMarkdown(text) && !html) {
          event.preventDefault();
          view.pasteHTML(markdownToHtml(text));
          return true;
        }

        if (text && text.includes("\n")) {
          event.preventDefault();
          pastePlainParagraphs(view, text);
          return true;
        }

        return false;
      },
    },
    onUpdate: ({ editor: ed }) => {
      localVersion.current += 1;
      serialize(ed);
    },
    onBlur: ({ editor: ed }) => {
      serialize(ed, true);
    },
  }, [collabSession]);

  useEffect(() => {
    if (editor && editor.isEditable !== editable) editor.setEditable(editable);
  }, [editable, editor]);

  useEffect(() => {
    if (!editor) return;
    if (editor.isFocused) return;
    if (content === lastEmittedMarkdown.current) return;
    if (localVersion.current !== acceptedVersion.current) return;
    const next = resolveInitialContent(content, contentJson);
    editor.commands.setContent(next, { emitUpdate: false });
    lastEmittedMarkdown.current = content;
    lastEmittedJson.current = contentJson ?? null;
    acceptedVersion.current = localVersion.current;
  }, [content, contentJson, editor]);

  const setLink = useCallback(async () => {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href;
    const url = await promptEditorInput({
      kind: "url",
      title: "Link URL",
      placeholder: "https://…",
      defaultValue: previousUrl,
    });
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
      if (e.key.toLowerCase() === "k" && editor.isFocused) {
        e.preventDefault();
        void setLink();
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
    (window as any).__nw_flushEditor = () => serialize(editor, true);
    (window as any).__nw_currentMarkdown = htmlToMarkdown(editor.getHTML());

    const onSlashPrompt = async (e: Event) => {
      const detail = (e as CustomEvent).detail as {
        type: "bookmark" | "embed" | "newPage";
        editor: typeof editor;
      };
      if (detail.type === "newPage") {
        const title = await promptEditorInput({
          kind: "text",
          title: "New page title",
          defaultValue: "Untitled",
        });
        if (title) onNewPage?.(title);
        return;
      }
      const url = await promptEditorInput({
        kind: "url",
        title: detail.type === "bookmark" ? "Paste URL for bookmark" : "Paste embed URL",
        placeholder: "https://…",
      });
      if (!url) return;
      if (detail.type === "bookmark") {
        const meta = await fetchLinkPreview(url);
        if (!insertBookmark(detail.editor, url, meta ?? undefined)) {
          toast.error("Only http(s) links can be bookmarked");
        }
      } else if (!insertEmbed(detail.editor, url)) {
        toast.error("Embeds are only allowed from trusted https sources");
      }
    };
    window.addEventListener("nw:slashPrompt", onSlashPrompt);

    return () => {
      delete (window as any).__nw_insertImage;
      delete (window as any).__nw_editor;
      delete (window as any).__nw_getMarkdown;
      delete (window as any).__nw_flushEditor;
      delete (window as any).__nw_currentMarkdown;
      window.removeEventListener("nw:slashPrompt", onSlashPrompt);
      if (serializeTimer.current) clearTimeout(serializeTimer.current);
    };
  }, [insertImage, editor, serialize, onNewPage]);

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
            if (isSafeHttpUrl(href)) {
              window.open(href, "_blank", "noopener,noreferrer");
            }
          }
        }
      }}
    >
      <EditorPopoverInput />
      <BlockMenu editor={editor} />
      <BlockActionMenu editor={editor} />
      {editable && <BlockContextMenu editor={editor} />}
      {editor && editable && (
        <>
          <BubbleMenuToolbar editor={editor} onSetLink={setLink} />
          <TableMenu editor={editor} />
        </>
      )}
      <EditorContent editor={editor} className="w-full min-w-0" />
    </div>
  );
}
