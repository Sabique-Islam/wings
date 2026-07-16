import { expect, test } from "@playwright/test";
import { focusEditor } from "./editor-helpers";

test.describe("Notion parity keyboard and blocks", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/__editor-e2e");
    await focusEditor(page);
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
    const calloutItem = page.locator(".slash-menu button", { hasText: "Callout" });
    await expect(calloutItem).toBeVisible();
    await calloutItem.click();
    await expect(editor.locator('[data-type="callout"]')).toHaveCount(1);
  });

  test("slash inserts toggle block", async ({ page }) => {
    const editor = page.locator(".ProseMirror");
    await page.keyboard.type("/toggle");
    const toggleItem = page.getByRole("button", { name: "Toggle Collapsible content" });
    await expect(toggleItem).toBeVisible();
    await toggleItem.click();
    await expect(editor.locator('[data-type="toggle"]')).toHaveCount(1);
  });

  test("Cmd+D duplicates block", async ({ page }) => {
    const editor = page.locator(".ProseMirror");
    await page.keyboard.type("duplicate me");
    await page.keyboard.press("Meta+d");
    const filled = editor.locator("p").filter({ hasText: "duplicate me" });
    await expect(filled).toHaveCount(2);
  });

  test("Esc selects current block", async ({ page }) => {
    const editor = page.locator(".ProseMirror");
    await page.keyboard.type("block one");
    await page.keyboard.press("Escape");
    await expect(editor.locator(".ProseMirror-selectednode, .nw-block-selected")).toHaveCount(1);
  });
});
