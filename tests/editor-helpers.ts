import type { Page } from "@playwright/test";

/** Dismiss the cookie banner so it does not steal keyboard focus in editor tests. */
export async function dismissCookieBanner(page: Page) {
  const dismiss = page.getByRole("button", { name: "dismiss" });
  if (await dismiss.isVisible().catch(() => false)) {
    await dismiss.click();
  }
}

export async function focusEditor(page: Page) {
  await dismissCookieBanner(page);
  const editor = page.locator(".ProseMirror");
  await editor.click();
  return editor;
}
