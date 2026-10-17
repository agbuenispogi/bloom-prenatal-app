import { defineConfig, devices } from "@playwright/test";

// E2E runs against the dev-only demo routes (/dev/*): the real UI and engine with synthetic data, no Supabase.
export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  retries: 0,
  reporter: [["list"]],
  use: { baseURL: "http://localhost:3100", trace: "retain-on-failure" },
  projects: [
    { name: "iphone", use: { ...devices["iPhone 15"], browserName: "chromium" }, testIgnore: /desktop|a11y/ },
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } }, testMatch: /desktop|a11y/ },
  ],
  webServer: {
    command: "npx next dev -p 3100",
    url: "http://localhost:3100/login",
    reuseExistingServer: true,
    timeout: 120_000,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "https://placeholder.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_placeholder",
      CRON_SECRET: "e2e-secret-0123456789abcdef-xyz",
    },
  },
});
