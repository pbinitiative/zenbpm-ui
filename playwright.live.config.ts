import { defineConfig, devices } from '@playwright/test';

const configuredBaseURL = process.env.E2E_BASE_URL?.trim();

if (process.env.CI && !configuredBaseURL) {
  throw new Error('E2E_BASE_URL must be set when running live Playwright tests in CI.');
}

const liveBaseURL = configuredBaseURL ?? 'http://localhost:3000';
const liveURL = new URL(liveBaseURL);

if (liveURL.protocol !== 'http:' && liveURL.protocol !== 'https:') {
  throw new Error('E2E_BASE_URL must use the http or https protocol.');
}

export default defineConfig({
  testDir: './e2e/live',
  globalSetup: './e2e/live/global-setup.ts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI
    ? [
        ['github'],
        ['html', { open: 'never' }],
      ]
    : [['html', { open: 'never' }]],
  use: {
    baseURL: liveURL.toString(),
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: configuredBaseURL
    ? undefined
    : {
        command: 'pnpm dev --mode live --port 3000 --strictPort',
        reuseExistingServer: true,
        timeout: 120 * 1000,
        url: liveURL.toString(),
      },
});
