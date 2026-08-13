import { test, expect } from '@playwright/test';
import { e2eBuildMetadata, e2eShortCommit } from '../fixtures/build-metadata';

const frontendMetadata = `${e2eBuildMetadata.version} (${e2eShortCommit})`;
const backendMetadata = `v${e2eBuildMetadata.version} (${e2eShortCommit})`;

test.describe('Build metadata footer', () => {
  test('displays embedded frontend metadata', async ({ page }) => {
    await page.goto('/');

    const footer = page.getByTestId('build-metadata-footer');
    await expect(footer).toContainText(`UI: ${frontendMetadata}`);
    await expect(footer).toContainText(`ZenBPM: ${backendMetadata}`);
    await expect(footer.locator('p').first()).toHaveClass(/MuiTypography-captionNormal/);
    await expect(footer.locator('p').first()).toHaveCSS('text-transform', 'none');
    await expect(footer.locator('p').last()).toHaveClass(/MuiTypography-captionNormal/);
    await expect(footer.locator('p').last()).toHaveCSS('text-transform', 'none');

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

    await expect(page.getByTestId('build-metadata-footer')).toContainText(`ZenBPM: ${backendMetadata}`);
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

    const status = page.getByTestId('build-metadata-status');
    await expect(status).toHaveText('Build metadata mismatch');
    await expect(status.locator('.MuiTypography-root')).toHaveClass(/MuiTypography-captionNormal/);
    await expect(status.locator('.MuiTypography-root')).toHaveCSS('text-transform', 'none');
    await expect(page.getByTestId('build-metadata-footer')).toContainText(`ZenBPM: v${e2eBuildMetadata.version}+ (${e2eShortCommit})`);
  });

  test('treats a backend release candidate as matching the same UI version', async ({ page }) => {
    await page.goto('/?systemStatusScenario=release-candidate');

    await expect(page.getByTestId('build-metadata-footer')).toContainText(`ZenBPM: v${e2eBuildMetadata.version}-rc1 (${e2eShortCommit})`);
    await expect(page.getByTestId('build-metadata-status')).not.toBeVisible();
  });

  test('treats differing frontend and backend commits as matching when versions match', async ({ page }) => {
    await page.goto('/?systemStatusScenario=commit-difference');

    await expect(page.getByTestId('build-metadata-footer')).toContainText(`ZenBPM: v${e2eBuildMetadata.version} (123456789abc)`);
    await expect(page.getByTestId('build-metadata-status')).not.toBeVisible();
  });
});
