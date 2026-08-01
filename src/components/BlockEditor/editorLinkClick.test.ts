import { describe, expect, it } from "vitest";
import { normalizeExternalHref, resolveEditorLinkAction } from "./editorLinkClick";

describe("normalizeExternalHref", () => {
  it("keeps absolute https urls", () => {
    expect(normalizeExternalHref("https://wavey.nopejs.me")).toBe("https://wavey.nopejs.me/");
  });

  it("prefixes https for bare hosts", () => {
    expect(normalizeExternalHref("stenoai.co")).toBe("https://stenoai.co/");
    expect(normalizeExternalHref("wavey.nopejs.me")).toBe("https://wavey.nopejs.me/");
  });

  it("rejects javascript and relative paths", () => {
    expect(normalizeExternalHref("javascript:alert(1)")).toBeNull();
    expect(normalizeExternalHref("/local/path")).toBeNull();
  });
});

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

  it("opens external links on plain click while editing", () => {
    expect(
      resolveEditorLinkAction({
        href: "https://stenoai.co",
        editable: true,
        modKey: false,
        middleClick: false,
      }),
    ).toEqual({ type: "openExternal", href: "https://stenoai.co/" });
  });

  it("opens bare-host links as https", () => {
    expect(
      resolveEditorLinkAction({
        href: "stenoai.co",
        editable: true,
        modKey: false,
        middleClick: false,
      }),
    ).toEqual({ type: "openExternal", href: "https://stenoai.co/" });
  });

  it("opens external links on middle-click while editing", () => {
    expect(
      resolveEditorLinkAction({
        href: "https://wavey.nopejs.me",
        editable: true,
        modKey: false,
        middleClick: true,
      }),
    ).toEqual({ type: "openExternal", href: "https://wavey.nopejs.me/" });
  });

  it("opens external links when read-only", () => {
    expect(
      resolveEditorLinkAction({
        href: "https://stenoai.co",
        editable: false,
        modKey: false,
        middleClick: false,
      }),
    ).toEqual({ type: "openExternal", href: "https://stenoai.co/" });
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
