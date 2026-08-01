export interface BlogPostMeta {
  slug: string;
  title: string;
  description: string;
  date: string;
  updated: string;
  tags: string[];
}

export interface BlogPost extends BlogPostMeta {
  /** Markdown body without frontmatter. */
  body: string;
  /** Full markdown including a generated title heading if missing. */
  raw: string;
}

const modules = import.meta.glob("./*.md", { query: "?raw", import: "default", eager: true }) as Record<
  string,
  string
>;

function parseFrontmatter(raw: string): { meta: Partial<BlogPostMeta>; body: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { meta: {}, body: raw.trim() };

  const yaml = match[1];
  const body = match[2].trim();
  const meta: Partial<BlogPostMeta> = { tags: [] };
  let inTags = false;

  for (const line of yaml.split(/\r?\n/)) {
    if (/^tags:\s*$/.test(line)) {
      inTags = true;
      continue;
    }
    if (inTags) {
      const tag = line.match(/^\s*-\s+(.+)\s*$/);
      if (tag) {
        (meta.tags as string[]).push(tag[1].replace(/^["']|["']$/g, ""));
        continue;
      }
      inTags = false;
    }
    const kv = line.match(/^(\w+):\s*(.+)\s*$/);
    if (!kv) continue;
    const key = kv[1];
    const value = kv[2].replace(/^["']|["']$/g, "");
    if (key === "slug" || key === "title" || key === "description" || key === "date" || key === "updated") {
      meta[key] = value;
    }
  }

  return { meta, body };
}

function loadPosts(): BlogPost[] {
  const posts: BlogPost[] = [];
  for (const [path, raw] of Object.entries(modules)) {
    if (path.endsWith("/index.ts")) continue;
    const { meta, body } = parseFrontmatter(raw);
    const slug = meta.slug ?? path.replace(/^\.\/|\.md$/g, "");
    if (!meta.title || !meta.description || !meta.date) {
      console.warn(`[blog] skipping ${path}: missing required frontmatter`);
      continue;
    }
    posts.push({
      slug,
      title: meta.title,
      description: meta.description,
      date: meta.date,
      updated: meta.updated ?? meta.date,
      tags: meta.tags ?? [],
      body,
      raw,
    });
  }
  return posts.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

export const BLOG_POSTS = loadPosts();

export function getPostBySlug(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}

/** Very small markdown subset for blog HTML (headings, paragraphs, lists, links, code, bold). */
export function blogMarkdownToHtml(md: string): string {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let inUl = false;
  let inOl = false;

  const closeLists = () => {
    if (inUl) {
      out.push("</ul>");
      inUl = false;
    }
    if (inOl) {
      out.push("</ol>");
      inOl = false;
    }
  };

  const inline = (text: string) =>
    text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" class="underline underline-offset-2 hover:text-foreground">$1</a>')
      .replace(/\[([^\]]+)\]\((\/[^)\s]*)\)/g, '<a href="$2" class="underline underline-offset-2 hover:text-foreground">$1</a>');

  for (const line of lines) {
    if (/^###\s+/.test(line)) {
      closeLists();
      out.push(`<h3 class="text-sm font-mono uppercase tracking-tight pt-4">${inline(line.replace(/^###\s+/, ""))}</h3>`);
      continue;
    }
    if (/^##\s+/.test(line)) {
      closeLists();
      out.push(
        `<h2 class="text-lg font-mono tracking-tight pt-8 text-foreground leading-snug">${inline(line.replace(/^##\s+/, ""))}</h2>`,
      );
      continue;
    }
    if (/^#\s+/.test(line)) {
      // Title is rendered by the page shell; skip duplicate H1 from markdown body.
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      if (!inUl) {
        closeLists();
        out.push('<ul class="list-none space-y-2 pl-0">');
        inUl = true;
      }
      out.push(`<li class="text-muted-foreground">▸ ${inline(line.replace(/^[-*]\s+/, ""))}</li>`);
      continue;
    }
    if (/^\d+\.\s+/.test(line)) {
      if (!inOl) {
        closeLists();
        out.push('<ol class="list-decimal space-y-2 pl-5">');
        inOl = true;
      }
      out.push(`<li class="text-muted-foreground">${inline(line.replace(/^\d+\.\s+/, ""))}</li>`);
      continue;
    }
    if (!line.trim()) {
      closeLists();
      continue;
    }
    closeLists();
    out.push(`<p class="text-muted-foreground">${inline(line)}</p>`);
  }
  closeLists();
  return out.join("\n");
}
