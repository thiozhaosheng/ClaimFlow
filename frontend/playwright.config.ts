import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    // Record every run so the user journey can be reviewed (and submitted) as
    // a video without having to watch the browser live.
    video: {
      mode: 'on',
      size: { width: 1280, height: 720 },
    },
    // `RECORD=1 npx playwright test` slows the run down so the captured video
    // is watchable. CI leaves it unset and runs at full speed.
    launchOptions: process.env.RECORD ? { slowMo: 250 } : {},
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
