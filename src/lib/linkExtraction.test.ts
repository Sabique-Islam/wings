import { describe, it, expect } from "vitest";
import type { JSONContent } from "@tiptap/core";
import { extractLinks, pageIdFromHref } from "./linkExtraction";

function paragraph(...content: JSONContent[]): JSONContent {
  return { type: "paragraph", content };
}

function pageLink(text: string, pageId: string): JSONContent {
  return { type: "text", text, marks: [{ type: "link", attrs: { href: `#page:${pageId}` } }] };
}

describe("pageIdFromHref", () => {
  it("reads the id out of a page link", () => {
    expect(pageIdFromHref("#page:abc-123")).toBe("abc-123");
  });

  it("ignores links that don't point at a page", () => {
    expect(pageIdFromHref("https://example.com")).toBeNull();
    expect(pageIdFromHref("#page:")).toBeNull();
    expect(pageIdFromHref(undefined)).toBeNull();
  });
});

describe("extractLinks", () => {
  it("collects page links from anywhere in the document", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [
        paragraph({ type: "text", text: "see " }, pageLink("Roadmap", "page-a")),
        {
          type: "bulletList",
          content: [
            { type: "listItem", content: [paragraph(pageLink("Notes", "page-b"))] },
          ],
        },
      ],
    };

    expect(extractLinks(doc).outgoing).toEqual(["page-a", "page-b"]);
  });

  it("counts a page linked twice only once", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [paragraph(pageLink("first", "page-a")), paragraph(pageLink("again", "page-a"))],
    };

    expect(extractLinks(doc).outgoing).toEqual(["page-a"]);
  });

  it("ignores external links", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [
        paragraph({
          type: "text",
          text: "docs",
          marks: [{ type: "link", attrs: { href: "https://example.com" } }],
        }),
      ],
    };

    expect(extractLinks(doc).outgoing).toEqual([]);
  });

  it("reports wikilinks that never resolved to a page", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [paragraph({ type: "text", text: "todo: [[Reading List]] and [[Ideas|x]]" })],
    };

    expect(extractLinks(doc).unresolved).toEqual(["Reading List", "Ideas"]);
  });

  it("treats an empty document as having no links", () => {
    expect(extractLinks(null)).toEqual({ outgoing: [], unresolved: [] });
    expect(extractLinks({ type: "doc", content: [] })).toEqual({ outgoing: [], unresolved: [] });
  });
});
