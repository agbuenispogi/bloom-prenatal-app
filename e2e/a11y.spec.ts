import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const pages = [
  "/dev/home?s=caltrate",
  "/dev/home?s=morning",
  "/dev/home?s=night",
  "/dev/home?s=caltrate&role=caregiver",
  "/dev/home?s=caltrate&alarm=1",
  "/dev/history",
  "/dev/history/2026-10-16",
  "/dev/settings",
  "/dev/settings/medications",
  "/dev/settings/shifts",
  "/dev/settings/notifications",
  "/dev/onboarding",
  "/login",
  "/signup",
];

for (const scheme of ["light", "dark"] as const) {
  test.describe(`accessibility (${scheme})`, () => {
    test.use({ colorScheme: scheme });
    for (const path of pages) {
      test(`${path} has no WCAG 2.1 AA violations`, async ({ page }) => {
        await page.goto(path);
        await page.waitForLoadState("networkidle");
        const results = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
          .exclude("nextjs-portal") // the Next.js dev indicator, not part of the app
          .analyze();
        const summary = results.violations.map((v) => `${v.id}: ${v.nodes.length}× ${v.nodes[0]?.target.join(" ")} (${v.nodes[0]?.failureSummary?.split("\n")[1]?.trim()})`);
        expect(summary).toEqual([]);
      });
    }
  });
}
