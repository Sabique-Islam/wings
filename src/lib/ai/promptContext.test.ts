import { describe, expect, it } from "vitest";
import {
  buildPromptContext,
  mentionsDrawing,
  mentionsVisual,
  NO_CONTEXT_SENT,
  type ActivePage,
} from "./promptContext";

const pages = [
  { id: "a", title: "Roadmap" },
  { id: "b", title: "Journal" },
];

function page(overrides: Partial<ActivePage> = {}): ActivePage {
  return {
    id: "a",
    title: "Roadmap",
    content: "# Roadmap\n\nShip the local store.",
    drawings: [],
    images: [],
    ...overrides,
  };
}

describe("buildPromptContext", () => {
  it("sends the full workspace and page on the first message", () => {
    const { context } = buildPromptContext(pages, page());
    expect(context).toContain("- Roadmap (id:a)");
    expect(context).toContain("Ship the local store.");
  });

  it("does not resend an unchanged page on the next message", () => {
    const first = buildPromptContext(pages, page());
    const second = buildPromptContext(pages, page(), first.sent);
    expect(second.context).not.toContain("Ship the local store.");
    expect(second.context).toContain("content unchanged since the last message");
    expect(second.context).toContain("Title: Roadmap");
  });

  it("resends the page as soon as its content changes", () => {
    const first = buildPromptContext(pages, page());
    const edited = page({ content: "# Roadmap\n\nShip the graph view." });
    const second = buildPromptContext(pages, edited, first.sent);
    expect(second.context).toContain("Ship the graph view.");
  });

  it("resends the page when the user switches pages", () => {
    const first = buildPromptContext(pages, page());
    const other = page({ id: "b", title: "Journal", content: "# Roadmap\n\nShip the local store." });
    const second = buildPromptContext(pages, other, first.sent);
    expect(second.context).toContain("Ship the local store.");
  });

  it("does not resend an unchanged page list", () => {
    const first = buildPromptContext(pages, page());
    const second = buildPromptContext(pages, page(), first.sent);
    expect(second.context).not.toContain("- Roadmap (id:a)");

    const withNewPage = buildPromptContext(
      [...pages, { id: "c", title: "Ideas" }],
      page(),
      second.sent,
    );
    expect(withNewPage.context).toContain("- Ideas (id:c)");
  });

  it("lists drawings without their pixels", () => {
    const { context } = buildPromptContext(
      pages,
      page({ drawings: [{ sceneId: "s1", elementCount: 4, hasImage: true }] }),
      NO_CONTEXT_SENT,
    );
    expect(context).toContain("sceneId=s1, elements=4 (image available)");
  });

  it("lists page images without their pixels or URLs", () => {
    const { context } = buildPromptContext(
      pages,
      page({ images: [{ alt: "receipt", hasUrl: true }] }),
      NO_CONTEXT_SENT,
    );
    expect(context).toContain("## Images on this page");
    expect(context).toContain("image 1: receipt (image available)");
    expect(context).not.toContain("http");
  });

  it("handles the home view with no open page", () => {
    const { context, sent } = buildPromptContext(pages, null);
    expect(context).toContain("(none — user is on the home view)");
    expect(sent.activePageId).toBeNull();
  });
});

describe("mentionsVisual", () => {
  it("matches messages about drawings and images", () => {
    expect(mentionsVisual("what does my diagram show?")).toBe(true);
    expect(mentionsVisual("Describe the sketch above")).toBe(true);
    expect(mentionsVisual("explain this drawing")).toBe(true);
    expect(mentionsVisual("what's in this image?")).toBe(true);
    expect(mentionsVisual("look at the photo")).toBe(true);
  });

  it("ignores ordinary writing requests", () => {
    expect(mentionsVisual("summarize this page in 3 bullets")).toBe(false);
    expect(mentionsVisual("continue writing")).toBe(false);
  });

  it("mentionsDrawing aliases mentionsVisual", () => {
    expect(mentionsDrawing("what's in this picture?")).toBe(true);
    expect(mentionsDrawing("continue writing")).toBe(false);
  });
});
