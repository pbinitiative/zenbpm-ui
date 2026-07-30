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
    baseURL: 'http://localhost:3001',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm dev --mode mocks --port 3001',
    env: {
      VITE_BUILD_COMMIT: 'abcdef0',
      VITE_E2E_TEST: 'true',
    },
    url: 'http://localhost:3001',
    reuseExistingServer: false,
    timeout: 120 * 1000,
  },
});
