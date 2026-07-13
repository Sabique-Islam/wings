// Regression tests for the markdown <-> html round trip.
//
// These guard against extension/conversion changes that have previously
// broken the editor in subtle ways:
//   - duplicate Link extension swallowing Enter
//   - turndown losing inline marks like bold/italic
//   - markdown shortcut tokens (`#`, `**…**`, `- `) failing to render as
//     real block/inline structure
//
// If any of these break, autosave silently desyncs from what the user sees
// and from what the AI reads — so we test the round trip exhaustively.

import { describe, it, expect } from "vitest";
import { htmlToMarkdown, markdownToHtml } from "./markdown";

function roundtrip(md: string): string {
  return htmlToMarkdown(markdownToHtml(md));
}

describe("markdown <-> html conversion", () => {
  it("preserves a heading", () => {
    const html = markdownToHtml("# Hello");
    expect(html).toContain("<h1");
    expect(html).toContain("Hello");
  });

  it("converts ** to bold", () => {
    const html = markdownToHtml("This is **bold** text");
    expect(html).toMatch(/<strong>bold<\/strong>/);
  });

  it("converts * to italic", () => {
    const html = markdownToHtml("This is *emph* text");
    expect(html).toMatch(/<em>emph<\/em>/);
  });

  it("renders unordered lists", () => {
    const html = markdownToHtml("- one\n- two\n- three");
    expect(html).toContain("<ul>");
    expect(html.match(/<li>/g)?.length).toBe(3);
  });

  it("renders ordered lists", () => {
    const html = markdownToHtml("1. a\n2. b");
    expect(html).toContain("<ol>");
  });

  it("renders fenced code blocks", () => {
    const html = markdownToHtml("```ts\nconst x = 1;\n```");
    expect(html).toContain("<pre>");
    expect(html).toContain("const x = 1;");
  });

  it("renders inline code", () => {
    expect(markdownToHtml("an `inline` token")).toMatch(/<code>inline<\/code>/);
  });

  it("preserves headings round-trip", () => {
    expect(roundtrip("# H1")).toBe("# H1");
    expect(roundtrip("## H2")).toBe("## H2");
  });

  it("preserves bold/italic round-trip", () => {
    const out = roundtrip("**hi** _there_");
    expect(out).toMatch(/\*\*hi\*\*/);
    expect(out).toMatch(/_there_/);
  });

  it("keeps paragraph breaks (blank line between paragraphs)", () => {
    const out = roundtrip("first paragraph\n\nsecond paragraph");
    expect(out).toMatch(/first paragraph\n\nsecond paragraph/);
  });

  it("does not collapse two paragraphs into one (Enter regression)", () => {
    const out = roundtrip("line one\n\nline two");
    expect(out.split(/\n\n+/).length).toBeGreaterThanOrEqual(2);
  });

  it("is empty-safe", () => {
    expect(markdownToHtml("")).toBe("");
    expect(htmlToMarkdown("")).toBe("");
  });

  it("escapes html in code fences via marked", () => {
    const html = markdownToHtml("```\n<script>\n```");
    expect(html).toContain("&lt;script&gt;");
  });
});
