import { Extension } from "@tiptap/core";
import { Plugin, PluginKey, NodeSelection, type EditorState } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { EditorView } from "@tiptap/pm/view";
import {
  deleteBlocksAtPositions,
  duplicateBlocksAtPositions,
  getDocChildBlockPositions,
  getTopLevelBlockPos,
  selectCurrentBlock,
  stepBlockSelection,
  type BlockDoc,
  type BlockPos,
} from "./blockUtils";

export const blockSelectionKey = new PluginKey("blockSelection");

interface BlockSelectionState {
  positions: number[];
  anchor: number | null;
}

export function getSelectedBlockPositions(state: EditorState): number[] {
  const pluginState = blockSelectionKey.getState(state) as BlockSelectionState | undefined;
  return pluginState?.positions ?? [];
}

function setBlockSelection(view: EditorView, positions: number[], anchor: number | null = null) {
  view.dispatch(
    view.state.tr.setMeta(blockSelectionKey, { positions, anchor } satisfies BlockSelectionState),
  );
}

function posFromEvent(view: EditorView, event: MouseEvent): number | null {
  const posInfo = view.posAtCoords({ left: event.clientX, top: event.clientY });
  if (!posInfo) return null;
  const $pos = view.state.doc.resolve(posInfo.pos);
  return getTopLevelBlockPos($pos as BlockPos);
}

function rangeSelect(anchor: number, target: number, doc: BlockDoc): number[] {
  const all = getDocChildBlockPositions(doc);
  const ai = all.indexOf(anchor);
  const ti = all.indexOf(target);
  if (ai < 0 || ti < 0) return [target];
  const [from, to] = ai < ti ? [ai, ti] : [ti, ai];
  return all.slice(from, to + 1);
}

/** How far left of the text column counts as the gutter. */
const MARGIN_DRAG_ZONE_PX = 64;

/**
 * Notion's margin drag: pressing in the left gutter and dragging sweeps whole
 * blocks rather than placing a caret. Ignored on a plain click so clicking the
 * margin still focuses the nearest line.
 */
function startMarginDrag(view: EditorView, event: MouseEvent): boolean {
  if (event.button !== 0) return false;
  const contentRect = view.dom.getBoundingClientRect();
  const offsetFromLeft = event.clientX - contentRect.left;
  if (offsetFromLeft > 0 || offsetFromLeft < -MARGIN_DRAG_ZONE_PX) return false;

  const anchor = posFromEvent(view, event);
  if (anchor == null) return false;

  let dragged = false;

  const onMove = (move: MouseEvent) => {
    const target = posFromEvent(view, move);
    if (target == null) return;
    dragged = true;
    setBlockSelection(view, rangeSelect(anchor, target, view.state.doc as BlockDoc), anchor);
  };

  const onUp = () => {
    document.removeEventListener("mousemove", onMove);
    document.removeEventListener("mouseup", onUp);
    // A press without movement is a click in the margin, not a selection.
    if (!dragged) setBlockSelection(view, [], null);
  };

  document.addEventListener("mousemove", onMove);
  document.addEventListener("mouseup", onUp);
  event.preventDefault();
  return true;
}

function getSelectionState(state: EditorState): BlockSelectionState {
  return (blockSelectionKey.getState(state) as BlockSelectionState) ?? { positions: [], anchor: null };
}

export const BlockSelection = Extension.create({
  name: "blockSelection",
  priority: 201,

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: blockSelectionKey,
        state: {
          init(): BlockSelectionState {
            return { positions: [], anchor: null };
          },
          apply(tr, value): BlockSelectionState {
            const meta = tr.getMeta(blockSelectionKey) as BlockSelectionState | undefined;
            if (meta) return meta;
            if (!tr.docChanged) return value;
            const positions = value.positions
              .map((p) => tr.mapping.map(p))
              .filter((p) => {
                const node = tr.doc.nodeAt(p);
                return node?.isBlock;
              });
            return {
              positions,
              anchor: value.anchor != null ? tr.mapping.map(value.anchor) : null,
            };
          },
        },
        props: {
          decorations(state) {
            const { positions } = (blockSelectionKey.getState(state) as BlockSelectionState) ?? {
              positions: [],
            };
            const decos: Decoration[] = [];
            for (const pos of positions) {
              const node = state.doc.nodeAt(pos);
              if (!node) continue;
              decos.push(
                Decoration.node(pos, pos + node.nodeSize, { class: "nw-block-selected" }),
              );
            }
            return DecorationSet.create(state.doc, decos);
          },
          // Typing or clicking exits block selection the way Notion does.
          handleTextInput(view) {
            if (getSelectionState(view.state).positions.length > 0) {
              setBlockSelection(view, [], null);
            }
            return false;
          },
          handleDOMEvents: {
            mousedown(view, event) {
              const e = event as MouseEvent;
              if (!e.shiftKey && !(e.metaKey && e.shiftKey) && !(e.altKey && e.shiftKey)) {
                if (startMarginDrag(view, e)) return true;
                if (getSelectionState(view.state).positions.length > 0) {
                  setBlockSelection(view, [], null);
                }
                return false;
              }
              const blockPos = posFromEvent(view, e);
              if (blockPos == null) return false;
              e.preventDefault();

              const pluginState = blockSelectionKey.getState(view.state) as BlockSelectionState;
              const mod = e.metaKey || e.ctrlKey;

              if (mod && e.shiftKey) {
                const exists = pluginState.positions.includes(blockPos);
                const next = exists
                  ? pluginState.positions.filter((p) => p !== blockPos)
                  : [...pluginState.positions, blockPos];
                setBlockSelection(view, next, pluginState.anchor ?? blockPos);
                view.dispatch(view.state.tr.setSelection(NodeSelection.create(view.state.doc, blockPos)));
                return true;
              }

              if (e.shiftKey) {
                const anchor = pluginState.anchor ?? blockPos;
                const range = rangeSelect(anchor, blockPos, view.state.doc as BlockDoc);
                setBlockSelection(view, range, anchor);
                view.dispatch(view.state.tr.setSelection(NodeSelection.create(view.state.doc, blockPos)));
                return true;
              }
              return false;
            },
          },
        },
      }),
    ];
  },

  addKeyboardShortcuts() {
    /**
     * Only acts while blocks are selected, so the caret keeps its normal arrow
     * behaviour when the user is just typing.
     */
    const walk = (direction: -1 | 1, extend: boolean) => () => {
      const { positions, anchor } = getSelectionState(this.editor.state);
      if (positions.length === 0) return false;
      const next = stepBlockSelection(
        this.editor.state.doc as BlockDoc,
        positions,
        anchor,
        direction,
        extend,
      );
      if (!next) return false;
      const view = this.editor.view;
      const head = direction > 0 ? Math.max(...next.positions) : Math.min(...next.positions);
      let tr = view.state.tr.setMeta(blockSelectionKey, next satisfies BlockSelectionState);
      try {
        tr = tr.setSelection(NodeSelection.create(view.state.doc, head));
      } catch {
        // Not every block accepts a node selection; the highlight still moves.
      }
      view.dispatch(tr.scrollIntoView());
      return true;
    };

    return {
      ArrowDown: walk(1, false),
      ArrowUp: walk(-1, false),
      "Shift-ArrowDown": walk(1, true),
      "Shift-ArrowUp": walk(-1, true),

      Escape: () => {
        const positions = getSelectedBlockPositions(this.editor.state);
        if (positions.length > 0) {
          setBlockSelection(this.editor.view, [], null);
          return true;
        }
        // Record the block in plugin state so arrow keys and block actions see it.
        const pos = selectCurrentBlock(this.editor);
        if (pos == null) return false;
        setBlockSelection(this.editor.view, [pos], pos);
        return true;
      },

      "Mod-/": () => {
        let positions = getSelectedBlockPositions(this.editor.state);
        if (positions.length === 0) {
          const pos = selectCurrentBlock(this.editor);
          if (pos != null) positions = [pos];
        }
        if (positions.length === 0) return false;
        setBlockSelection(this.editor.view, positions, positions[0] ?? null);
        const rect = this.editor.view.coordsAtPos(positions[0]!);
        window.dispatchEvent(
          new CustomEvent("nw:blockActionMenu", {
            detail: { positions, x: rect.left, y: rect.bottom + 4 },
          }),
        );
        return true;
      },

      Backspace: () => {
        const positions = getSelectedBlockPositions(this.editor.state);
        if (positions.length === 0) return false;
        deleteBlocksAtPositions(this.editor, positions);
        setBlockSelection(this.editor.view, [], null);
        return true;
      },

      Delete: () => {
        const positions = getSelectedBlockPositions(this.editor.state);
        if (positions.length === 0) return false;
        deleteBlocksAtPositions(this.editor, positions);
        setBlockSelection(this.editor.view, [], null);
        return true;
      },

      "Mod-d": () => {
        const positions = getSelectedBlockPositions(this.editor.state);
        if (positions.length > 1) {
          duplicateBlocksAtPositions(this.editor, positions);
          return true;
        }
        return false;
      },
    };
  },
});
