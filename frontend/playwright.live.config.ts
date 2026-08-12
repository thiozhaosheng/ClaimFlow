import { defineConfig, devices } from '@playwright/test';

/**
 * Temporary config for the live-backend correction journey. Kept out of
 * playwright.config.ts so `npx playwright test` stays runnable on a CI box
 * with no API, database or Azure credentials.
 */
export default defineConfig({
  testDir: './e2e-live',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
  ],
});
