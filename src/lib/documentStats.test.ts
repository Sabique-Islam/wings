import { describe, it, expect } from "vitest";
import { countWords, countWordsInDoc } from "./documentStats";

describe("countWords", () => {
  it("collapses runs of whitespace", () => {
    expect(countWords("  two   words \n")).toBe(2);
  });

  it("counts nothing in blank text", () => {
    expect(countWords("   \n ")).toBe(0);
  });
});

describe("countWordsInDoc", () => {
  it("adds up text across nested blocks", () => {
    const words = countWordsInDoc({
      type: "doc",
      content: [
        { type: "heading", content: [{ type: "text", text: "Weekly review" }] },
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [{ type: "paragraph", content: [{ type: "text", text: "ship the editor" }] }],
            },
          ],
        },
      ],
    });

    expect(words).toBe(5);
  });

  it("ignores nodes that carry no text", () => {
    expect(
      countWordsInDoc({
        type: "doc",
        content: [{ type: "horizontalRule" }, { type: "paragraph" }],
      }),
    ).toBe(0);
  });

  it("treats a missing document as empty", () => {
    expect(countWordsInDoc(null)).toBe(0);
  });
});
