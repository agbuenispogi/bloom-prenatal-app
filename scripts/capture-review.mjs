// Captures review screenshots of the dev demo (needs `npm run dev`). Usage: node scripts/capture-review.mjs [baseUrl]
import { chromium } from "@playwright/test";

const base = process.argv[2] ?? "http://localhost:3000";
const out = ".impeccable/review";
const shots = [
  { file: "mobile.png", s: "caltrate", w: 390, h: 844, scheme: "light", full: true },
  { file: "mobile-dark.png", s: "night", w: 390, h: 844, scheme: "dark", full: true },
  { file: "mobile-morning.png", s: "morning", w: 390, h: 844, scheme: "light", full: false },
  { file: "mobile-overdue-dark.png", s: "overdue", w: 390, h: 844, scheme: "dark", full: false },
  { file: "desktop.png", s: "caltrate", w: 1440, h: 900, scheme: "light", full: true },
  { file: "desktop-dark.png", s: "anmum", w: 1280, h: 800, scheme: "dark", full: true },
  { file: "mobile-caregiver.png", s: "caltrate", role: "caregiver", w: 390, h: 844, scheme: "light", full: false },
];

const browser = await chromium.launch();
for (const shot of shots) {
  const page = await browser.newPage({ viewport: { width: shot.w, height: shot.h }, colorScheme: shot.scheme, deviceScaleFactor: 2, reducedMotion: "reduce" });
  await page.goto(`${base}/dev/home?s=${shot.s}${shot.role ? `&role=${shot.role}` : ""}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${out}/${shot.file}`, fullPage: shot.full });
  await page.close();
  console.log("captured", shot.file);
}
await browser.close();
