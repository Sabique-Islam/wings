// Pure helpers that turn a vault file's path and frontmatter into page updates.
// Kept free of I/O so sync can apply them after create/update without re-testing
// the file-system layer.

import type { Entry } from "@/lib/journal";
import { normalizeProperties, normalizeTag, type EntryProperties } from "@/lib/entryProperties";
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
  // Never parent a page under itself (cycle) — leave it alone.
  if (nextParent === entry.id) return undefined;
  return nextParent;
}

/** Merge frontmatter tags into page properties without dropping date. */
export function propertiesWithVaultTags(
  existing: EntryProperties | undefined,
  vaultTags: string[],
): EntryProperties | null {
  if (vaultTags.length === 0) return null;
  const current = normalizeProperties(existing);
  const tags = Array.from(new Set([...current.tags, ...vaultTags.map(normalizeTag)].filter(Boolean)));
  const same =
    tags.length === current.tags.length && tags.every((tag, i) => tag === current.tags[i]);
  if (same) return null;
  return { ...current, tags };
}
