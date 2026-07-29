// Pure helpers that turn a vault file's path into page hierarchy updates.
// Kept free of I/O so sync can apply them after create/update without re-testing
// the file-system layer.

import type { Entry } from "@/lib/journal";
import { parentPathForFile } from "./frontmatter";

/** Resolve the Wings parent id implied by a file's folder path, if any. */
export function resolveParentIdFromPath(
  relativePath: string,
  idByPath: Map<string, string>,
): string | null {
  const parentPath = parentPathForFile(relativePath);
  if (!parentPath) return null;
  return idByPath.get(parentPath) ?? null;
}

/**
 * Whether the file's location disagrees with the page's current parent.
 *
 * Returns the parent id to write (including `null` for a top-level file), or
 * `undefined` when nothing needs to change.
 */
export function parentIdChangeForFile(
  relativePath: string,
  entry: Entry,
  idByPath: Map<string, string>,
): string | null | undefined {
  const nextParent = resolveParentIdFromPath(relativePath, idByPath);
  if (entry.parent_id === nextParent) return undefined;
  if (nextParent === entry.id) return undefined;
  return nextParent;
}
