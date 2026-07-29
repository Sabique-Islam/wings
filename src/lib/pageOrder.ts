// Sidebar ordering: where a page sits among its siblings.
//
// Pages start out ordered by creation date. Dragging one writes an explicit
// `sort_order` for the whole list, so the arrangement survives reloads without
// every later page needing a value of its own.

import type { Entry } from "./journal";

export type DropPlacement = "before" | "after";

interface Sibling {
  id: string;
  created_at: string;
  sort_order: number | null;
}

/** Newest first until someone drags, then the dragged order wins. */
export function compareSiblings(a: Sibling, b: Sibling): number {
  const order = (a.sort_order ?? 0) - (b.sort_order ?? 0);
  if (order !== 0) return order;
  return b.created_at.localeCompare(a.created_at);
}

export function sortSiblings<T extends Sibling>(entries: T[]): T[] {
  return [...entries].sort(compareSiblings);
}

/**
 * The `sort_order` values that put `draggedId` next to `targetId`.
 *
 * Returns the whole list renumbered rather than a single value: gap-based
 * insertion drifts toward unusable precision after enough drags, and a sidebar
 * list is short enough that rewriting it is cheap.
 */
export function reorderSiblings(
  siblings: Sibling[],
  draggedId: string,
  targetId: string,
  placement: DropPlacement,
): Array<{ id: string; sort_order: number }> {
  if (draggedId === targetId) return [];
  const ordered = sortSiblings(siblings);
  const dragged = ordered.find((entry) => entry.id === draggedId);
  if (!dragged || !ordered.some((entry) => entry.id === targetId)) return [];

  const without = ordered.filter((entry) => entry.id !== draggedId);
  const targetIndex = without.findIndex((entry) => entry.id === targetId);
  const insertAt = placement === "before" ? targetIndex : targetIndex + 1;
  without.splice(insertAt, 0, dragged);

  return without.map((entry, index) => ({ id: entry.id, sort_order: index }));
}

/** True when `parentId` sits under `entryId`, which would make the tree a loop. */
export function isDescendantOf(entries: Entry[], entryId: string, parentId: string): boolean {
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  let current = byId.get(parentId);
  while (current) {
    if (current.id === entryId) return true;
    current = current.parent_id ? byId.get(current.parent_id) : undefined;
  }
  return false;
}
