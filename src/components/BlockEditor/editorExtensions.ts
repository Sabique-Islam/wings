import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Link from "@tiptap/extension-link";
import Dropcursor from "@tiptap/extension-dropcursor";
import Typography from "@tiptap/extension-typography";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { TextAlign } from "@tiptap/extension-text-align";
import { Highlight } from "@tiptap/extension-highlight";
import { FontFamily } from "@tiptap/extension-font-family";
import { FloatingImage } from "./FloatingImageExtension";
import { createSlashCommandExtension } from "./SlashCommandExtension";
import { Callout } from "./CalloutExtension";
import { ToggleBlock } from "./ToggleExtension";
import { BlockMath, InlineMath } from "./MathExtension";
import { ExcalidrawNode } from "./ExcalidrawExtension";
import { WritingExperience } from "./WritingExperienceExtension";
import { BlockHandle } from "./BlockHandleExtension";

interface BlockEditorExtensionHandlers {
  onImageUpload?: (file?: File) => void;
  onLinkPage?: () => void;
  onNewPage?: (title: string) => void;
  onAskAI?: () => void;
}

// Notion-style per-block placeholder.
// Only show a hint on nodes where the user needs one; empty paragraphs stay
// silent unless they're the very first block of an empty document.
const PLACEHOLDER_BY_NODE: Record<string, string> = {
  heading: "Heading",
  blockquote: "Empty quote",
  bulletList: "List",
  orderedList: "List",
  taskList: "To-do",
  taskItem: "To-do",
  callout: "Callout",
};

export function createBlockEditorExtensions(handlers: BlockEditorExtensionHandlers = {}) {
  return [
    WritingExperience,
    BlockHandle,
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      codeBlock: {
        HTMLAttributes: { class: "code-block" },
      },
      dropcursor: false,
      horizontalRule: {
        HTMLAttributes: { class: "editor-hr" },
      },
      // StarterKit v3 bundles Link by default. Keep one Link extension only;
      // duplicates register competing keymaps/input rules and can swallow Enter.
      link: false,
    }),

    Placeholder.configure({
      placeholder: ({ node, editor, pos }) => {
        // Empty paragraph: show hint ONLY on the first top-level paragraph of
        // an empty document. Every other empty paragraph stays silent (Notion).
        if (node.type.name === "paragraph") {
          const doc = editor.state.doc;
          const isFirstTopLevel = pos === 0;
          const isOnlyBlock =
            doc.childCount === 1 && doc.firstChild?.type.name === "paragraph";
          if (isFirstTopLevel && isOnlyBlock) {
            return "Write, press '/' for commands, or ask AI…";
          }
          return "";
        }
        if (node.type.name === "heading") {
          const level = (node.attrs as any).level ?? 1;
          return `Heading ${level}`;
        }
        return PLACEHOLDER_BY_NODE[node.type.name] ?? "";
      },
      showOnlyWhenEditable: true,
      showOnlyCurrent: true,
      includeChildren: false,
    }),
    TaskList,
    TaskItem.configure({ nested: true }),
    FloatingImage.configure({
      HTMLAttributes: { class: "editor-image" },
      allowBase64: true,
    }),
    Link.configure({
      openOnClick: false,
      autolink: true,
      linkOnPaste: true,
      HTMLAttributes: { class: "editor-link" },
    }),
    Dropcursor.configure({ color: "hsl(0 0% 40%)", width: 2 }),
    Typography,
    Table.configure({
      resizable: true,
      HTMLAttributes: { class: "editor-table" },
    }),
    TableRow,
    TableCell,
    TableHeader,
    Callout,
    ToggleBlock,
    BlockMath,
    InlineMath,
    ExcalidrawNode,
    TextStyle,
    Color,
    FontFamily,
    Highlight.configure({ multicolor: true }),
    TextAlign.configure({ types: ["heading", "paragraph"], alignments: ["left", "center", "right", "justify"] }),
    createSlashCommandExtension({
      onImageUpload: () => handlers.onImageUpload?.(),
      onLinkPage: () => handlers.onLinkPage?.(),
      onNewPage: (title: string) => handlers.onNewPage?.(title),
      onAskAI: () => handlers.onAskAI?.(),
    }),
  ];
}