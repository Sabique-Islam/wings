import { expect, test } from "@playwright/test";

test.describe("Notion parity keyboard and blocks", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/__editor-e2e");
    const editor = page.locator(".ProseMirror");
    await expect(editor).toBeVisible();
    await editor.click();
  });

  test("Backspace on empty second paragraph merges upward", async ({ page }) => {
    const editor = page.locator(".ProseMirror");
    await page.keyboard.type("hello");
    await page.keyboard.press("Enter");
    await page.keyboard.press("Backspace");
    await expect(editor.locator("p")).toHaveCount(1);
    await expect(editor.locator("p").first()).toContainText("hello");
  });

  test("slash inserts callout block", async ({ page }) => {
    const editor = page.locator(".ProseMirror");
    await page.keyboard.type("/callout");
    await page.keyboard.press("Enter");
    await expect(editor.locator('[data-type="callout"]')).toHaveCount(1);
  });

  test("slash inserts toggle block", async ({ page }) => {
    const editor = page.locator(".ProseMirror");
    await page.keyboard.type("/toggle");
    await page.keyboard.press("Enter");
    await expect(editor.locator('[data-type="toggle"]')).toHaveCount(1);
  });

  test("Cmd+D duplicates block", async ({ page }) => {
    const editor = page.locator(".ProseMirror");
    await page.keyboard.type("duplicate me");
    await page.keyboard.press("Enter");
    await page.keyboard.press("Meta+d");
    await expect(editor.locator("p")).toHaveCount(2);
    await expect(editor.locator("p").nth(0)).toContainText("duplicate me");
    await expect(editor.locator("p").nth(1)).toContainText("duplicate me");
  });

  test("Esc selects current block", async ({ page }) => {
    const editor = page.locator(".ProseMirror");
    await page.keyboard.type("block one");
    await page.keyboard.press("Escape");
    await expect(editor.locator(".ProseMirror-selectednode, .nw-block-selected")).toHaveCount(1);
  });
});
