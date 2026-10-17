import { expect, type Page } from "@playwright/test";

// The Next up card is the first section on Home; its title is the first serif paragraph.
export const card = (page: Page) => page.locator("main, body").locator("section").first();
export const cardTitle = (page: Page) => card(page).locator("p.font-serif").first();

export async function openHome(page: Page, query: string) {
  await page.goto(`/dev/home?${query}`);
  await expect(cardTitle(page)).toBeVisible();
}

// Waits for the inked-check moment to finish and the next item to settle in.
export async function afterInk(page: Page) {
  await expect(page.locator("[role=status] svg")).toHaveCount(0, { timeout: 5000 });
}
