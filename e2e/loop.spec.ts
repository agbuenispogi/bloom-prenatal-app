import { expect, test } from "@playwright/test";
import { afterInk, card, cardTitle, openHome } from "./helpers";

test.describe("the care-day loop", () => {
  test("a whole day: skip breakfast → lunch → doses → dinner → Anmum → bedtime → all done", async ({ page }) => {
    await openHome(page, "s=morning");
    await expect(cardTitle(page)).toHaveText("Eating breakfast soon?");

    await page.getByRole("button", { name: "Skip breakfast" }).click();
    await expect(cardTitle(page)).toHaveText("Eating lunch soon?");

    await page.getByRole("button", { name: /I'm eating in ~30 min/ }).click();
    await expect(page.getByRole("status").filter({ hasText: "Gaviscon logged" })).toBeVisible();
    await afterInk(page);
    await expect(cardTitle(page)).toHaveText(/^Eat lunch at/);

    await page.getByRole("button", { name: "Eating now" }).click();
    await afterInk(page);
    await expect(cardTitle(page)).toHaveText("Caltrate");
    await expect(card(page)).toContainText("after lunch");

    // Keep doing whatever Next up asks until the page is done. Each step must be one clear action.
    const seen: string[] = [];
    for (let i = 0; i < 14; i++) {
      const title = (await cardTitle(page).textContent())?.trim() ?? "";
      seen.push(title);
      if (title === "All done for today") break;
      const primary = card(page).getByRole("button", { name: /^(Done|I'm eating in ~\d+ min|Eating now|Going to bed)$/ });
      await expect(primary).toHaveCount(1);
      await primary.click();
      await afterInk(page);
      await expect(cardTitle(page)).not.toHaveText(title === "Going to bed?" ? "Going to bed?" : "\u0000");
    }
    expect(seen.at(-1)).toBe("All done for today");
    expect(seen).toEqual(expect.arrayContaining(["Caltrate", "Eating dinner soon?", "Ferrous sulfate + Folic acid", "Anmum Materna", "Going to bed?", "Gaviscon"]));

    // The finished page: nothing due, the bedtime dose is inked, Anmum counted.
    await expect(page.getByText("Due now")).toHaveCount(0);
    await expect(page.getByLabel("Any time today")).toContainText("1 of 1–2 today");
  });

  test("snooze moves the dose; skip records her reason on the page", async ({ page }) => {
    await openHome(page, "s=caltrate");
    await page.getByRole("button", { name: "Snooze" }).click();
    await page.getByRole("button", { name: "10 min" }).click();
    await expect(card(page)).toContainText("12:41");
    await expect(page.getByRole("listitem").filter({ hasText: "Caltrate" }).first()).toContainText("Snoozed");

    await page.getByRole("button", { name: "Skip" }).click();
    await page.getByLabel("Reason (optional)").fill("felt nauseous");
    await page.getByRole("button", { name: "Skip this dose" }).click();
    await expect(page.getByRole("listitem").filter({ hasText: "felt nauseous" })).toContainText("Skipped");
  });

  test("the log-meal sheet logs a snack at an earlier time", async ({ page }) => {
    await openHome(page, "s=afternoon");
    await page.getByRole("button", { name: "Log a meal" }).click();
    const sheet = page.getByRole("dialog", { name: "Log a meal" });
    await expect(sheet).toBeVisible();
    await sheet.getByText("Snack", { exact: true }).click();
    await sheet.getByText("Earlier", { exact: true }).click();
    await sheet.getByLabel("What time?").fill("15:00");
    await sheet.getByRole("button", { name: "Log snack" }).click();
    await expect(sheet).toBeHidden();
    await expect(page.getByRole("listitem").filter({ hasText: "Snack" })).toContainText("3:00 PM");
  });

  test("Anmum: one tap adds a glass", async ({ page }) => {
    await openHome(page, "s=morning");
    await page.getByRole("button", { name: /Had a glass/ }).click();
    await expect(page.getByLabel("Any time today")).toContainText("1 of 1–2 today");
  });

  test("the in-app alarm: Done from the full-screen prompt logs the dose", async ({ page }) => {
    await openHome(page, "s=caltrate&alarm=1");
    const alarm = page.getByRole("alertdialog", { name: "Caltrate" });
    await expect(alarm).toBeVisible();
    await expect(alarm.getByRole("button", { name: "Done" })).toBeFocused();
    await alarm.getByRole("button", { name: "Done" }).click();
    await expect(alarm).toBeHidden();
    await afterInk(page);
    await expect(cardTitle(page)).not.toHaveText("Caltrate");
  });

  test("the caregiver sees her page but can't log by default", async ({ page }) => {
    await openHome(page, "s=caltrate&role=caregiver");
    await expect(card(page)).toContainText("She logs this one. You'll get the same reminder.");
    await expect(page.getByRole("button", { name: "Done" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Log a meal" })).toHaveCount(0);
  });
});

test.describe("around the app", () => {
  test("History: yesterday's summary and a past page", async ({ page }) => {
    await page.goto("/dev/home?s=caltrate");
    await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "History" }).click();
    await expect(page.getByRole("heading", { name: "Yesterday" })).toBeVisible();
    await expect(page.getByRole("img", { name: /of doses on time/ })).toBeVisible();
    await page.getByRole("link", { name: /Fri 16 Oct/ }).click();
    await expect(page.getByRole("heading", { name: "Friday, 16 October" })).toBeVisible();
    await expect(page.getByRole("listitem").filter({ hasText: "after dinner" }).filter({ hasText: "Caltrate" })).toContainText("Missed");
  });

  test("Settings: edit a medicine and save", async ({ page }) => {
    await page.goto("/dev/settings");
    await page.getByRole("link", { name: /Medicines/ }).click();
    await page.getByText("Gaviscon", { exact: true }).first().click();
    await page.getByRole("button", { name: "Save Gaviscon" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Saved (demo)." })).toBeVisible();
  });

  test("onboarding on iPhone: Home Screen guide, then alarms", async ({ page }) => {
    await page.goto("/dev/onboarding");
    await expect(page.getByRole("heading", { name: "Keep Bloom on your Home Screen" })).toBeVisible();
    await expect(page.getByText("Add to Home Screen")).toBeVisible();
    await page.getByRole("button", { name: "I've added it" }).click();
    await expect(page.getByRole("heading", { name: "Turn on dose alarms" })).toBeVisible();
    await page.getByRole("button", { name: "Turn on alarms" }).click();
    await expect(page.getByRole("status")).toContainText("Open Bloom from your Home Screen first");
  });

  test("signed-out visitors are sent to sign in", async ({ page }) => {
    for (const path of ["/", "/history", "/settings/medications", "/onboarding"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login/);
    }
    await expect(page.getByLabel("Keep me signed in")).toBeChecked();
  });

  test("installable PWA: manifest, icons and service worker are served", async ({ request }) => {
    const manifest = await (await request.get("/manifest.webmanifest")).json();
    expect(manifest).toMatchObject({ name: "Bloom", display: "standalone", start_url: "/" });
    for (const icon of manifest.icons as { src: string }[]) expect((await request.get(icon.src)).status()).toBe(200);
    const sw = await request.get("/sw.js");
    expect(sw.status()).toBe(200);
    expect(await sw.text()).toContain("notificationclick");
    expect((await request.get("/apple-icon.png")).status()).toBe(200);
  });

  test("the reminder endpoints refuse callers without the secret or a valid token", async ({ request }) => {
    expect((await request.post("/api/reminders/dispatch")).status()).toBe(401);
    expect((await request.post("/api/reminders/dispatch", { headers: { Authorization: "Bearer wrong" } })).status()).toBe(401);
    expect((await request.post("/api/notify-action", { data: { token: "x".repeat(20), action: "taken" } })).status()).toBe(401);
    expect((await request.get("/api/ics?t=forged")).status()).toBe(410);
  });
});
