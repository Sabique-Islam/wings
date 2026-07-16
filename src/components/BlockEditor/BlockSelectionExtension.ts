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
          handleDOMEvents: {
            mousedown(view, event) {
              const e = event as MouseEvent;
              if (!e.shiftKey && !(e.metaKey && e.shiftKey) && !(e.altKey && e.shiftKey)) {
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
    return {
      Escape: () => {
        const positions = getSelectedBlockPositions(this.editor.state);
        if (positions.length > 0) {
          setBlockSelection(this.editor.view, [], null);
          return true;
        }
        return selectCurrentBlock(this.editor);
      },

      "Mod-/": () => {
        let positions = getSelectedBlockPositions(this.editor.state);
        if (positions.length === 0) {
          selectCurrentBlock(this.editor);
          const { $from } = this.editor.state.selection;
          const pos = getTopLevelBlockPos($from as BlockPos);
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

      "Mod-Shift-ArrowUp": () => {
        const positions = getSelectedBlockPositions(this.editor.state);
        if (positions.length <= 1) return false;
        return false;
      },
    };
  },
});
