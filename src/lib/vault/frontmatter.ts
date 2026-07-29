import { getEntryTitle, type Entry } from "@/lib/journal";
import { extractTagsFromFrontmatter } from "@/lib/linkExtraction";

export interface VaultFrontmatter {
  wingsId: string | null;
  title: string | null;
  date: string | null;
  tags: string[];
  body: string;
}

export function titleFromContent(content: string): string {
  return content.split("\n")[0].replace(/^#+\s*/, "").trim() || "untitled";
}

export function slug(title: string): string {
  return title.slice(0, 60).replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "untitled";
}

export function serializeVaultMarkdown(entry: Entry, tags: string[] = []): string {
  const title = entry.title || titleFromContent(entry.content);
  const date = new Date(entry.created_at).toLocaleDateString("default", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const lines = [
    "---",
    `wings_id: ${entry.id}`,
    `title: ${title}`,
    `date: ${date}`,
  ];
  if (tags.length > 0) {
    lines.push(`tags: [${tags.join(", ")}]`);
  }
  lines.push("---", "", entry.content);
  return lines.join("\n");
}

export function parseVaultMarkdown(raw: string): VaultFrontmatter {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    return {
      wingsId: null,
      title: null,
      date: null,
      tags: [],
      body: raw.trim(),
    };
  }
  const head = match[1];
  const body = match[2].trim();
  const wingsId = head.match(/^wings_id:\s*(.+)$/im)?.[1]?.trim() ?? null;
  const title = head.match(/^title:\s*(.+)$/im)?.[1]?.trim() ?? null;
  const date = head.match(/^date:\s*(.+)$/im)?.[1]?.trim() ?? null;
  const tags = extractTagsFromFrontmatter(`---\n${head}\n---\n`);
  return { wingsId, title, date, tags, body };
}

export function entryToRelativePath(entry: Entry, entriesById: Map<string, Entry>): string {
  const chain: Entry[] = [entry];
  let current = entry;
  while (current.parent_id) {
    const parent = entriesById.get(current.parent_id);
    if (!parent) break;
    chain.unshift(parent);
    current = parent;
  }
  const folders = chain.slice(0, -1).map((e) => slug(getEntryTitle(e)));
  const fileName = `${slug(getEntryTitle(entry))}.md`;
  return [...folders, fileName].join("/");
}
