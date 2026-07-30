import { test, expect } from '@playwright/test';

const frontendMetadata = '1.5.0 (abcdef0)';

test.describe('Build metadata footer', () => {
  test('displays embedded frontend metadata', async ({ page }) => {
    await page.goto('/');

    const footer = page.getByTestId('build-metadata-footer');
    await expect(footer).toContainText(`UI: ${frontendMetadata}`);
    await expect(footer).toContainText(`ZenBPM: ${frontendMetadata}`);

    const footerText = await footer.textContent();
    expect(footerText?.indexOf('ZenBPM')).toBeLessThan(footerText?.indexOf('UI'));
  });

  test('fetches backend metadata from system status without calling the removed info endpoint', async ({ page }) => {
    const requestedSystemEndpoints: string[] = [];
    page.on('request', (request) => {
      const pathname = new URL(request.url()).pathname;
      if (pathname.startsWith('/system/')) {
        requestedSystemEndpoints.push(pathname);
      }
    });

    await page.goto('/');

    await expect(page.getByTestId('build-metadata-footer')).toContainText(`ZenBPM: ${frontendMetadata}`);
    expect(requestedSystemEndpoints).toContain('/system/status');
    expect(requestedSystemEndpoints).not.toContain('/system/info');
  });

  test('shows a loading backend state while the status request is pending', async ({ page }) => {
    await page.goto('/?systemStatusScenario=loading');

    await expect(page.getByTestId('build-metadata-footer')).toContainText('ZenBPM: loading');
  });

  test('shows an unavailable backend state when the status request fails', async ({ page }) => {
    await page.goto('/?systemStatusScenario=error');

    await expect(page.getByTestId('build-metadata-footer')).toContainText('ZenBPM: unavailable');
  });

  test('hides the status indicator when frontend and backend metadata match', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByTestId('build-metadata-status')).not.toBeVisible();
  });

  test('marks differing metadata, including a plus suffix, as mismatching', async ({ page }) => {
    await page.goto('/?systemStatusScenario=mismatch');

    await expect(page.getByTestId('build-metadata-status')).toHaveText('Build metadata mismatch');
    await expect(page.getByTestId('build-metadata-footer')).toContainText('ZenBPM: 1.5.0+ (abcdef0)');
  });

  test('treats a backend release candidate as matching the same UI version', async ({ page }) => {
    await page.goto('/?systemStatusScenario=release-candidate');

    await expect(page.getByTestId('build-metadata-footer')).toContainText('ZenBPM: 1.5.0-rc1 (abcdef0)');
    await expect(page.getByTestId('build-metadata-status')).not.toBeVisible();
  });

  test('treats differing frontend and backend commits as matching when versions match', async ({ page }) => {
    await page.goto('/?systemStatusScenario=commit-difference');

    await expect(page.getByTestId('build-metadata-footer')).toContainText('ZenBPM: 1.5.0 (1234567)');
    await expect(page.getByTestId('build-metadata-status')).not.toBeVisible();
  });
});
