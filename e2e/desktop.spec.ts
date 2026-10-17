import { expect, test } from "@playwright/test";

test("desktop: Next up and Today side by side, nav at the top", async ({ page }) => {
  await page.goto("/dev/home?s=caltrate");
  const card = page.locator("section").first();
  const today = page.getByRole("heading", { name: "Today" });
  const cardBox = (await card.boundingBox())!;
  const todayBox = (await today.boundingBox())!;
  expect(todayBox.x).toBeGreaterThan(cardBox.x + cardBox.width);
  const nav = (await page.getByRole("navigation", { name: "Main" }).boundingBox())!;
  expect(nav.y).toBeLessThan(100);
});
