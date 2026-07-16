import type { Editor } from "@tiptap/core";
import { TextSelection, NodeSelection } from "@tiptap/pm/state";

/**
 * Structural types for position/doc helpers.
 * Avoids importing ResolvedPos/Node from @tiptap/pm/model — nested copies of
 * prosemirror-model under prosemirror-state cause incompatible TS identities.
 */
export interface BlockPos {
  depth: number;
  before(depth: number): number;
  index(depth: number): number;
  node(depth: number): { type: { name: string }; nodeSize?: number };
}

export interface BlockDoc {
  forEach(fn: (node: { nodeSize: number; copy(content: unknown): unknown }, offset: number) => void): void;
  nodeAt(pos: number): { isBlock: boolean; nodeSize: number; copy(content: unknown): unknown } | null;
  content: { size: number };
  resolve(pos: number): BlockPos;
}

/** Depth of the block that is a direct child of the document. */
export function findTopLevelDepth($from: BlockPos): number {
  let depth = $from.depth;
  while (depth > 0 && $from.node(depth - 1).type.name !== "doc") depth--;
  return depth;
}

export function getTopLevelBlockPos($from: BlockPos): number | null {
  const depth = findTopLevelDepth($from);
  if (depth < 1) return null;
  return $from.before(depth);
}

export function getTopLevelBlockIndex($from: BlockPos): number {
  const depth = findTopLevelDepth($from);
  return depth >= 1 ? $from.index(depth - 1) : -1;
}

/** All direct-child block positions in the document. */
export function getDocChildBlockPositions(doc: BlockDoc): number[] {
  const positions: number[] = [];
  doc.forEach((_node, offset) => {
    positions.push(offset);
  });
  return positions;
}

export function selectCurrentBlock(editor: Editor): boolean {
  const { $from } = editor.state.selection;
  const pos = getTopLevelBlockPos($from as BlockPos);
  if (pos == null) return false;
  try {
    const tr = editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, pos));
    editor.view.dispatch(tr);
    return true;
  } catch {
    return false;
  }
}

export function deleteBlocksAtPositions(editor: Editor, positions: number[]): boolean {
  if (!positions.length) return false;
  const sorted = [...positions].sort((a, b) => b - a);
  let tr = editor.state.tr;
  for (const pos of sorted) {
    const node = tr.doc.nodeAt(pos);
    if (!node) continue;
    tr = tr.delete(pos, pos + node.nodeSize);
  }
  const mapped = Math.min(sorted[sorted.length - 1]!, tr.doc.content.size);
  tr.setSelection(TextSelection.near(tr.doc.resolve(Math.max(1, mapped))));
  editor.view.dispatch(tr.scrollIntoView());
  return true;
}

export function duplicateBlocksAtPositions(editor: Editor, positions: number[]): boolean {
  if (!positions.length) return false;
  const sorted = [...positions].sort((a, b) => a - b);
  let tr = editor.state.tr;
  let insertOffset = 0;
  for (const pos of sorted) {
    const mapped = tr.mapping.map(pos + insertOffset);
    const node = tr.doc.nodeAt(mapped);
    if (!node) continue;
    tr = tr.insert(mapped + node.nodeSize, node.copy(node.content));
    insertOffset += node.nodeSize;
  }
  editor.view.dispatch(tr.scrollIntoView());
  return true;
}
