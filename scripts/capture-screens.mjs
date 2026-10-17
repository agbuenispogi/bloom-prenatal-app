// Captures review screenshots of the Phase 4 secondary screens from the dev demos (needs the dev server).
// Usage: node scripts/capture-screens.mjs [baseUrl]
import { chromium, devices } from "@playwright/test";

const base = process.argv[2] ?? "http://localhost:3000";
const out = ".impeccable/review/screens";
const iphone = devices["iPhone 15"];
const shots = [
  { file: "sheet-mobile.png", path: "/dev/home?s=caltrate", click: "Log a meal", full: false },
  { file: "sheet-earlier-dark.png", path: "/dev/home?s=afternoon", click: "Log a meal", then: "Earlier", scheme: "dark", full: false },
  { file: "history-mobile.png", path: "/dev/history", full: true },
  { file: "history-day-mobile.png", path: "/dev/history/2026-10-16", full: true },
  { file: "history-desktop-dark.png", path: "/dev/history", w: 1280, h: 800, scheme: "dark", full: true },
  { file: "settings-hub.png", path: "/dev/settings", full: true },
  { file: "settings-medications.png", path: "/dev/settings/medications", open: "summary", full: true },
  { file: "settings-shifts.png", path: "/dev/settings/shifts", full: true },
  { file: "settings-notifications-dark.png", path: "/dev/settings/notifications", scheme: "dark", full: true },
  { file: "onboarding-iphone.png", path: "/dev/onboarding", ios: true, full: false },
];

const browser = await chromium.launch();
for (const s of shots) {
  const ctx = await browser.newContext({
    ...(s.ios ? { userAgent: iphone.userAgent } : {}),
    viewport: { width: s.w ?? 390, height: s.h ?? 844 },
    deviceScaleFactor: 2,
    colorScheme: s.scheme ?? "light",
    reducedMotion: "reduce",
  });
  const page = await ctx.newPage();
  await page.goto(`${base}${s.path}`, { waitUntil: "networkidle" });
  if (s.click) await page.getByRole("button", { name: s.click }).click();
  if (s.then) await page.getByText(s.then, { exact: true }).click();
  if (s.open) await page.locator(s.open).first().click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${out}/${s.file}`, fullPage: s.full });
  await ctx.close();
  console.log("captured", s.file);
}
await browser.close();
