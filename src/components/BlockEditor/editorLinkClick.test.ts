import { describe, expect, it } from "vitest";
import { resolveEditorLinkAction } from "./editorLinkClick";

describe("resolveEditorLinkAction", () => {
  it("navigates internal page links on any click", () => {
    expect(
      resolveEditorLinkAction({
        href: "#page:abc",
        editable: true,
        modKey: false,
        middleClick: false,
      }),
    ).toEqual({ type: "navigatePage", pageId: "abc" });
  });

  it("ignores plain click on external links while editing", () => {
    expect(
      resolveEditorLinkAction({
        href: "https://stenoai.co",
        editable: true,
        modKey: false,
        middleClick: false,
      }),
    ).toEqual({ type: "ignore" });
  });

  it("opens external links on mod-click while editing", () => {
    expect(
      resolveEditorLinkAction({
        href: "https://stenoai.co",
        editable: true,
        modKey: true,
        middleClick: false,
      }),
    ).toEqual({ type: "openExternal", href: "https://stenoai.co" });
  });

  it("opens external links on middle-click while editing", () => {
    expect(
      resolveEditorLinkAction({
        href: "https://stenoai.co",
        editable: true,
        modKey: false,
        middleClick: true,
      }),
    ).toEqual({ type: "openExternal", href: "https://stenoai.co" });
  });

  it("opens external links on plain click when read-only", () => {
    expect(
      resolveEditorLinkAction({
        href: "https://stenoai.co",
        editable: false,
        modKey: false,
        middleClick: false,
      }),
    ).toEqual({ type: "openExternal", href: "https://stenoai.co" });
  });

  it("ignores javascript: urls", () => {
    expect(
      resolveEditorLinkAction({
        href: "javascript:alert(1)",
        editable: false,
        modKey: true,
        middleClick: false,
      }),
    ).toEqual({ type: "ignore" });
  });
});
