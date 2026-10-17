// Phase 7 mobile visual review: first viewport of every screen at 390×844, light and dark, iPhone UA.
// Usage: node scripts/capture-qa.mjs [baseUrl]   (QA build: BLOOM_DEMO=1 next build && next start)
import { chromium, devices } from "@playwright/test";

const base = process.argv[2] ?? "http://localhost:3200";
const out = ".impeccable/review/qa";
const screens = [
  ["home-morning", "/dev/home?s=morning"],
  ["home-caltrate", "/dev/home?s=caltrate"],
  ["home-overdue", "/dev/home?s=overdue"],
  ["home-night", "/dev/home?s=night"],
  ["home-anmum", "/dev/home?s=anmum"],
  ["home-done", "/dev/home?s=done"],
  ["home-caregiver", "/dev/home?s=caltrate&role=caregiver"],
  ["alarm", "/dev/home?s=caltrate&alarm=1"],
  ["history", "/dev/history"],
  ["history-day", "/dev/history/2026-10-16"],
  ["settings", "/dev/settings"],
  ["settings-meds", "/dev/settings/medications"],
  ["settings-shifts", "/dev/settings/shifts"],
  ["settings-reminders", "/dev/settings/notifications"],
  ["onboarding", "/dev/onboarding"],
  ["login", "/login"],
];
const browser = await chromium.launch();
for (const scheme of ["light", "dark"]) {
  for (const [name, path] of screens) {
    const ctx = await browser.newContext({ userAgent: devices["iPhone 15"].userAgent, viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: scheme, reducedMotion: "reduce" });
    const page = await ctx.newPage();
    await page.goto(base + path, { waitUntil: "networkidle" });
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${out}/${name}-${scheme}.png` });
    await ctx.close();
  }
}
await browser.close();
console.log(`captured ${screens.length * 2}`);
