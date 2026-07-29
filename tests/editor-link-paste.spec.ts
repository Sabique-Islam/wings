import { expect, test } from "@playwright/test";
import { focusEditor } from "./editor-helpers";

test.describe("External link paste", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/__editor-e2e");
    await focusEditor(page);
  });

  test("pasting a bare URL inserts one bookmark, not duplicate inline text", async ({ page }) => {
    const url = "https://github.com/org/repo";
    const editor = page.locator(".ProseMirror");

    await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.evaluate(async (pasteUrl) => {
      await navigator.clipboard.writeText(pasteUrl);
    }, url);
    await page.keyboard.press("Meta+v");

    await expect(editor.locator('[data-type="bookmark"]')).toHaveCount(1);
    await expect(editor.locator("a.editor-link")).toHaveCount(0);

    const urlInTopLevelParagraph = await page.evaluate((pasteUrl) => {
      const root = document.querySelector(".ProseMirror");
      if (!root) return false;
      return Array.from(root.children).some(
        (el) => el.tagName === "P" && (el.textContent ?? "").includes(pasteUrl),
      );
    }, url);
    expect(urlInTopLevelParagraph).toBe(false);
  });
});
