import { defineConfig, devices } from '@playwright/test';
import { e2eBuildMetadata } from './e2e/fixtures/build-metadata';

const e2eBaseURL = 'http://localhost:3100';

export default defineConfig({
  testDir: './e2e',
  testIgnore: ['**/smoke/**', '**/live/**'],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: e2eBaseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm dev --mode mocks --port 3100 --strictPort',
    env: {
      VITE_BUILD_COMMIT: e2eBuildMetadata.commit,
      VITE_BUILD_BRANCH: e2eBuildMetadata.branch,
      VITE_BUILD_TIME: e2eBuildMetadata.time,
      VITE_E2E_TEST: 'true',
    },
    url: e2eBaseURL,
    reuseExistingServer: false,
    timeout: 120 * 1000,
  },
});
