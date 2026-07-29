import { expect, test } from "@playwright/test";
import { focusEditor } from "./editor-helpers";

/**
 * Page embeds used to come back as "Page not found" after any reload that went
 * through markdown, because `![[Title]]` carries no page id. These tests pin the
 * whole loop: insert, serialize, load again.
 */
test.describe("Page embeds", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/__editor-e2e");
    await focusEditor(page);
  });

  test("![[ inserts an embed card for the chosen page", async ({ page }) => {
    await page.keyboard.type("![[Reading");

    await page.getByRole("button", { name: "Reading List" }).click();

    const embed = page.locator('.ProseMirror [data-type="page-embed"]');
    await expect(embed).toHaveCount(1);
    await expect(embed).toContainText("Reading List");
    await expect(embed).toContainText("Books to get through this year.");
    await expect(page.locator(".ProseMirror")).not.toContainText("![[");
  });

  test("the saved markdown keeps the page id", async ({ page }) => {
    await page.keyboard.type("![[Release");
    await page.getByRole("button", { name: "Release Notes" }).click();
    await page.locator("body").click({ position: { x: 5, y: 5 } });

    await expect(page.getByTestId("stored-text")).toContainText(
      "![Release Notes](#page:page-release-notes)",
    );
  });

  test("the embed still resolves after loading from markdown alone", async ({ page }) => {
    await page.keyboard.type("![[Reading");
    await page.getByRole("button", { name: "Reading List" }).click();
    await page.locator("body").click({ position: { x: 5, y: 5 } });
    await expect(page.getByTestId("stored-text")).toContainText("#page:page-reading-list");

    await page.getByTestId("reload-from-markdown").click();

    const embed = page.locator('.ProseMirror [data-type="page-embed"]');
    await expect(embed).toHaveCount(1);
    await expect(embed).toContainText("Books to get through this year.");
    await expect(embed).not.toContainText("Page not found");
  });
});
