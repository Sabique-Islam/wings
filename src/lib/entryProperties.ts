// Page properties — the small, fixed set of fields shown above the editor.
//
// Stored as one JSONB column, so everything that reads it has to cope with rows
// written before the column existed and with hand-edited JSON.

export interface EntryProperties {
  /** ISO `yyyy-mm-dd`, or null when unset. */
  date: string | null;
  tags: string[];
}

export const EMPTY_PROPERTIES: EntryProperties = { date: null, tags: [] };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Tags are matched against link-index hashtags, which are lowercase and unspaced. */
export function normalizeTag(raw: string): string {
  return raw.trim().replace(/^#/, "").replace(/\s+/g, "-").toLowerCase();
}

export function normalizeProperties(value: unknown): EntryProperties {
  if (value == null || typeof value !== "object") return EMPTY_PROPERTIES;
  const raw = value as Record<string, unknown>;

  const date = typeof raw.date === "string" ? raw.date.trim() : "";
  const tags = Array.isArray(raw.tags)
    ? raw.tags.filter((tag): tag is string => typeof tag === "string").map(normalizeTag)
    : [];

  return {
    date: ISO_DATE.test(date) ? date : null,
    tags: Array.from(new Set(tags.filter(Boolean))),
  };
}

export function isEmptyProperties(properties: EntryProperties): boolean {
  return !properties.date && properties.tags.length === 0;
}
