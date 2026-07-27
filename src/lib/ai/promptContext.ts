// Builds the workspace/page context that rides along with every AI request.
//
// Cost matters here: the page snapshot is by far the largest part of a request,
// and resending an unchanged 6000-character page on every follow-up message is
// pure waste. We stamp each section with a cheap revision and send only the
// sections that moved since the previous message in the same conversation.

export interface ContextPage {
  id: string;
  title: string;
}

export interface ActivePage {
  id: string;
  title: string;
  content: string;
  drawings: { sceneId: string; elementCount: number; hasImage: boolean }[];
}

/** Revisions of what the model has already seen in this conversation. */
export interface SentContext {
  pageList: string;
  activePageId: string | null;
  activePage: string;
}

export interface PromptContext {
  context: string;
  sent: SentContext;
}

/** Pages beyond this add tokens without helping the model navigate. */
const MAX_LISTED_PAGES = 30;
const MAX_PAGE_CHARS = 6000;

/** Small non-cryptographic hash; we only need "did this change". */
function revision(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

export const NO_CONTEXT_SENT: SentContext = {
  pageList: "",
  activePageId: null,
  activePage: "",
};

export function buildPromptContext(
  pages: ContextPage[],
  activePage: ActivePage | null,
  sent: SentContext = NO_CONTEXT_SENT,
): PromptContext {
  const pageList = pages
    .slice(0, MAX_LISTED_PAGES)
    .map((p) => `- ${p.title} (id:${p.id})`)
    .join("\n");
  const pageListRevision = revision(pageList);

  const sections: string[] = [];
  if (pageListRevision === sent.pageList) {
    sections.push("## User's workspace\n(unchanged since the last message)");
  } else {
    sections.push(`## User's workspace\nPages (most recent first):\n${pageList || "(none)"}`);
  }

  if (!activePage) {
    sections.push("## Currently open page\n(none — user is on the home view)");
    return {
      context: sections.join("\n\n"),
      sent: { pageList: pageListRevision, activePageId: null, activePage: "" },
    };
  }

  const content = activePage.content.slice(0, MAX_PAGE_CHARS);
  const pageRevision = revision(`${activePage.title}\n${content}`);
  const samePage = sent.activePageId === activePage.id;

  if (samePage && pageRevision === sent.activePage) {
    sections.push(
      `## Currently open page\nTitle: ${activePage.title}\n(content unchanged since the last message)`,
    );
  } else {
    sections.push(
      `## Currently open page\nTitle: ${activePage.title}\n\nContent:\n\`\`\`md\n${content}\n\`\`\``,
    );
  }

  if (activePage.drawings.length) {
    const lines = activePage.drawings
      .map(
        (d, i) =>
          `- drawing ${i + 1}: sceneId=${d.sceneId}, elements=${d.elementCount}${d.hasImage ? " (image available)" : ""}`,
      )
      .join("\n");
    sections.push(`## Excalidraw drawings on this page\n${lines}`);
  }

  return {
    context: sections.join("\n\n"),
    sent: {
      pageList: pageListRevision,
      activePageId: activePage.id,
      activePage: pageRevision,
    },
  };
}

const DRAWING_INTENT =
  /\b(draw(ing|ings)?|sketch(es)?|diagram(s)?|canvas|excalidraw|whiteboard|flow ?chart|wireframe(s)?|image(s)?|picture(s)?|screenshot(s)?|visual(s)?)\b/i;

/**
 * Drawing snapshots are the most expensive thing we can attach, so they go out
 * only when the user's message is actually about them.
 */
export function mentionsDrawing(userMessage: string): boolean {
  return DRAWING_INTENT.test(userMessage);
}
