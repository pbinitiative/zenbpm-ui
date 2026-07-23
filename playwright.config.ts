import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testIgnore: '**/smoke/**',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm dev --mode mocks',
    env: {
      VITE_BUILD_COMMIT: 'abcdef0123456789abcdef0123456789abcdef01',
      VITE_BUILD_BRANCH: 'feat/system-status',
      VITE_BUILD_TIME: '2026-08-10T08:00:00Z',
      VITE_E2E_TEST: 'true',
    },
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
