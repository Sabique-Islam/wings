import { expect, test } from "@playwright/test";
import { focusEditor } from "./editor-helpers";

test.describe("Wikilinks", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/__editor-e2e");
    await focusEditor(page);
  });

  test("[[ picks a page and inserts a page link", async ({ page }) => {
    const editor = page.locator(".ProseMirror");
    await page.keyboard.type("see [[Reading");

    const option = page.getByRole("button", { name: "Reading List" });
    await expect(option).toBeVisible();
    await option.click();

    const link = editor.locator('a[href="#page:page-reading-list"]');
    await expect(link).toHaveCount(1);
    await expect(link).toHaveText("Reading List");
    // The trigger text is consumed, not left behind next to the link.
    await expect(editor).not.toContainText("[[");
  });

  test("[[ offers to create a page that does not exist yet", async ({ page }) => {
    await page.keyboard.type("[[Brand New Page");

    const create = page.getByRole("button", { name: /New page/ });
    await expect(create).toBeVisible();
    await create.click();

    await expect(page.getByTestId("requested-page")).toHaveText("Brand New Page");
    await expect(page.locator(".ProseMirror")).not.toContainText("[[");
  });

  test("arrow keys and Enter choose from the wikilink list", async ({ page }) => {
    const editor = page.locator(".ProseMirror");
    await page.keyboard.type("[[Re");
    await expect(page.getByRole("button", { name: "Reading List" })).toBeVisible();

    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");

    await expect(editor.locator('a[href^="#page:"]')).toHaveCount(1);
  });

  test("a page link round-trips through the markdown that gets saved", async ({ page }) => {
    await page.keyboard.type("[[Release");
    await page.getByRole("button", { name: "Release Notes" }).click();
    // Blur so the save pipeline takes a full serialize.
    await page.locator("body").click({ position: { x: 5, y: 5 } });

    await expect(page.getByTestId("stored-text")).toContainText(
      "[Release Notes](#page:page-release-notes)",
    );
  });
});
