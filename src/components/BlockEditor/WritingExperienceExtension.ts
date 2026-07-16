import { Extension } from "@tiptap/core";
import { TextSelection, NodeSelection } from "@tiptap/pm/state";
import { turnInto, type TurnIntoType } from "./blockCommands";

// ─────────────────────────────────────────────────────────────────────────────
// WritingExperience — the "Notion-parity" keymap.
//
// Priority = 200: above StarterKit's node keymaps (100) so we get a first look
// at Enter/Backspace, but BELOW Suggestion plugins (500). Slash-menu keeps its
// Enter binding when its popup is open. This was the root cause of Enter being
// swallowed at priority 1000.
// ─────────────────────────────────────────────────────────────────────────────

function hasNode(editor: any, name: string): boolean {
  return Boolean(editor.state.schema.nodes[name]);
}

function currentTextBlock(editor: any) {
  const { selection } = editor.state;
  const { $from } = selection;
  if (!selection.empty || !$from.parent?.isTextblock) return null;
  return {
    node: $from.parent,
    text: $from.parent.textContent || "",
    offset: $from.parentOffset,
    from: $from.start(),
    to: $from.end(),
    depth: $from.depth,
    typeName: $from.parent.type.name,
  };
}

function applyEnterMarkdownShortcut(editor: any): boolean {
  const block = currentTextBlock(editor);
  if (!block || block.offset !== block.text.length) return false;

  const text = block.text.trim();

  const codeFence = text.match(/^(```|~~~)([\w-]+)?$/);
  if (codeFence) {
    const language = codeFence[2] || null;
    let chain = editor.chain().deleteRange({ from: block.from, to: block.to });
    chain = language ? chain.setCodeBlock({ language }) : chain.setCodeBlock();
    return chain.run();
  }

  if (/^(---|___|\*\*\*)$/.test(text)) {
    return editor
      .chain()
      .deleteRange({ from: block.from, to: block.to })
      .setHorizontalRule()
      .run();
  }

  return false;
}

/** Notion behavior: pressing Enter on an empty heading/quote/callout leaves
 *  that block-type and converts the current line to a plain paragraph. */
function convertEmptyDecorationToParagraph(editor: any): boolean {
  const block = currentTextBlock(editor);
  if (!block) return false;
  if (block.text.length !== 0) return false;
  const decorativeTypes = new Set(["heading", "blockquote", "callout"]);
  if (!decorativeTypes.has(block.typeName)) return false;
  return editor.chain().setParagraph().run();
}

/** Backspace at position 0 of a heading/quote/callout collapses it back to
 *  a paragraph — matches Notion and every serious block editor. */
function backspaceAtStartOfDecoration(editor: any): boolean {
  const { selection } = editor.state;
  if (!selection.empty) return false;
  const { $from } = selection;
  if ($from.parentOffset !== 0) return false;
  const decorativeTypes = new Set(["heading", "blockquote", "callout"]);
  if (!decorativeTypes.has($from.parent.type.name)) return false;
  return editor.chain().setParagraph().run();
}

/** Nest the current top-level block into the previous sibling when it's a container. */
function nestIntoPreviousSibling(editor: any): boolean {
  const { state, view } = editor;
  const { $from } = state.selection;
  let depth = $from.depth;
  while (depth > 0 && $from.node(depth - 1).type.name !== "doc") depth--;
  if (depth < 1) return false;

  const indexInParent = $from.index(depth - 1);
  if (indexInParent === 0) return false;

  const parent = $from.node(depth - 1);
  const prev = parent.child(indexInParent - 1);
  const nestable = new Set(["blockquote", "callout", "toggle"]);
  if (!nestable.has(prev.type.name)) return false;

  const blockPos = $from.before(depth);
  const block = $from.node(depth);
  const insertPos = blockPos - prev.nodeSize + prev.nodeSize - 1;

  const tr = state.tr;
  tr.delete(blockPos, blockPos + block.nodeSize);
  const mappedInsert = tr.mapping.map(insertPos);
  tr.insert(mappedInsert, block);
  tr.setSelection(TextSelection.near(tr.doc.resolve(mappedInsert + 1)));
  tr.scrollIntoView();
  view.dispatch(tr);
  return true;
}

/** Move the current block up or down by one sibling. */
function moveBlock(editor: any, direction: "up" | "down"): boolean {
  const { state, view } = editor;
  const { $from } = state.selection;
  // Find the ancestor that's a direct child of the doc.
  let depth = $from.depth;
  while (depth > 0 && $from.node(depth - 1).type.name !== "doc") depth--;
  if (depth < 1) return false;

  const parent = $from.node(depth - 1);
  const indexInParent = $from.index(depth - 1);
  const targetIndex =
    direction === "up" ? indexInParent - 1 : indexInParent + 1;
  if (targetIndex < 0 || targetIndex >= parent.childCount) return false;

  const blockPos = $from.before(depth);
  const block = parent.child(indexInParent);
  const sibling = parent.child(targetIndex);

  const tr = state.tr;
  if (direction === "up") {
    const siblingPos = blockPos - sibling.nodeSize;
    tr.delete(blockPos, blockPos + block.nodeSize);
    tr.insert(siblingPos, block);
    tr.setSelection(TextSelection.near(tr.doc.resolve(siblingPos + 1)));
  } else {
    const afterSiblingPos = blockPos + block.nodeSize + sibling.nodeSize;
    tr.insert(afterSiblingPos, block);
    tr.delete(blockPos, blockPos + block.nodeSize);
    const finalPos = blockPos + sibling.nodeSize;
    tr.setSelection(TextSelection.near(tr.doc.resolve(finalPos + 1)));
  }
  tr.scrollIntoView();
  view.dispatch(tr);
  return true;
}

/** Duplicate the current top-level block below itself. */
function duplicateBlock(editor: any): boolean {
  const { state, view } = editor;
  const { $from } = state.selection;
  let depth = $from.depth;
  while (depth > 0 && $from.node(depth - 1).type.name !== "doc") depth--;
  if (depth < 1) return false;

  const blockPos = $from.before(depth);
  const block = $from.node(depth);
  const insertPos = blockPos + block.nodeSize;

  const tr = state.tr.insert(insertPos, block.copy(block.content));
  tr.setSelection(TextSelection.near(tr.doc.resolve(insertPos + 1)));
  tr.scrollIntoView();
  view.dispatch(tr);
  return true;
}

/** Select the top-level block containing the cursor. */
function selectCurrentBlock(editor: any): boolean {
  const { $from } = editor.state.selection;
  let depth = $from.depth;
  while (depth > 0 && $from.node(depth - 1).type.name !== "doc") depth--;
  if (depth < 1) return false;
  const pos = $from.before(depth);
  try {
    const tr = editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, pos));
    editor.view.dispatch(tr);
    return true;
  } catch {
    return false;
  }
}

const TURN_INTO_KEYS: Record<string, TurnIntoType> = {
  "0": "paragraph",
  "1": "heading1",
  "2": "heading2",
  "3": "heading3",
  "4": "bulletList",
  "5": "orderedList",
  "6": "taskList",
  "7": "toggle",
  "8": "codeBlock",
};

export const WritingExperience = Extension.create({
  name: "writingExperience",
  // Above StarterKit (100), below Suggestion (500). This keeps the slash menu
  // in control of Enter while its popup is open, and never masks node-typed
  // handlers we haven't overridden.
  priority: 200,

  addKeyboardShortcuts() {
    const enter = () => {
      if (!this.editor.isEditable) return false;

      // 1. Markdown shortcuts at end-of-line (code fences, horizontal rules).
      if (applyEnterMarkdownShortcut(this.editor)) return true;

      // 2. Empty heading/quote/callout → convert back to paragraph.
      if (convertEmptyDecorationToParagraph(this.editor)) return true;

      // 3. Delegate the rest to a strict Notion-order chain. Crucially we do
      //    NOT run `createParagraphNear` here — it inserts a sibling paragraph
      //    below the current block even when the caret is mid-line, which is
      //    the "Enter did nothing / text jumped" bug users reported. Falling
      //    through to `splitBlock({ keepMarks: true })` is what Notion does.
      return this.editor.commands.first(({ commands }) => [
        () => commands.newlineInCode(),
        () =>
          hasNode(this.editor, "taskItem")
            ? commands.splitListItem("taskItem")
            : false,
        () =>
          hasNode(this.editor, "listItem")
            ? commands.splitListItem("listItem")
            : false,
        () => commands.splitBlock({ keepMarks: true }),
      ]);
    };

    return {
      Enter: enter,
      "Shift-Enter": () => this.editor.commands.setHardBreak(),
      "Mod-Enter": () =>
        this.editor.commands.exitCode() || this.editor.commands.setHardBreak(),

      Backspace: () => backspaceAtStartOfDecoration(this.editor),

      Tab: () => {
        if (this.editor.can().sinkListItem("listItem")) {
          return this.editor.chain().focus().sinkListItem("listItem").run();
        }
        if (this.editor.can().sinkListItem("taskItem")) {
          return this.editor.chain().focus().sinkListItem("taskItem").run();
        }
        return nestIntoPreviousSibling(this.editor);
      },
      "Shift-Tab": () => {
        if (this.editor.can().liftListItem("listItem")) {
          return this.editor.chain().focus().liftListItem("listItem").run();
        }
        if (this.editor.can().liftListItem("taskItem")) {
          return this.editor.chain().focus().liftListItem("taskItem").run();
        }
        return false;
      },

      Escape: () => selectCurrentBlock(this.editor),

      "Mod-a": () => {
        const { selection, doc } = this.editor.state;
        if (selection instanceof NodeSelection) {
          return this.editor.commands.selectAll();
        }
        const { $from } = selection;
        let depth = $from.depth;
        while (depth > 0 && $from.node(depth - 1).type.name !== "doc") depth--;
        if (depth >= 1) {
          const from = $from.before(depth);
          const to = from + $from.node(depth).nodeSize;
          if (selection.from !== from || selection.to !== to) {
            const tr = this.editor.state.tr.setSelection(
              TextSelection.create(doc, from, Math.min(to, doc.content.size)),
            );
            this.editor.view.dispatch(tr);
            return true;
          }
        }
        return this.editor.commands.selectAll();
      },

      // Block movement / duplication — Notion parity keymap.
      "Mod-Shift-ArrowUp": () => moveBlock(this.editor, "up"),
      "Mod-Shift-ArrowDown": () => moveBlock(this.editor, "down"),
      "Mod-d": () => duplicateBlock(this.editor),

      ...Object.fromEntries(
        Object.entries(TURN_INTO_KEYS).map(([key, type]) => [
          `Mod-Alt-${key}`,
          () => turnInto(this.editor, type),
        ]),
      ),
    };
  },
});
