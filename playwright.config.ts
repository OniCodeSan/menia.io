import { defineConfig, devices } from "@playwright/test";

// Tests target BASE_URL (default: produzione menia.io). Per dev locale:
//   BASE_URL=http://localhost:5173 npx playwright test
// Per le 3 test serve in env:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (provisioning fixtures)
//   API_URL (default https://menia.io/api) — endpoint API server-side
//   STRIPE_WEBHOOK_SECRET (opzionale: se presente firma il payload del webhook test)

export default defineConfig({
  testDir: "./tests",
  // exFAT/macOS rilascia file ._* (AppleDouble) accanto ai sorgenti — esclusi.
  testIgnore: ["**/._*"],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false, // I test creano utenti reali in DB — sequenziale evita collisions
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: process.env.BASE_URL || "https://menia.io",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
