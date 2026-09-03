import { expect, test } from '@playwright/test';
import { e2eBuildMetadata, e2eShortCommit } from '../fixtures/build-metadata';

const escapedVersion = e2eBuildMetadata.version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

test.describe('System status', () => {
  test('displays backend and frontend build information', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'System Status' }).click();
    await expect(page).toHaveURL(/\/system-status$/);

    const buildInformation = page.getByTestId('system-build-information');
    const backend = buildInformation.getByTestId('backend-build-information');
    const frontend = buildInformation.getByTestId('frontend-build-information');
    const topology = page.getByTestId('system-cluster-topology');
    const nodeRow = topology.getByRole('row').filter({ hasText: 'node-1' });

    await expect(buildInformation).toContainText('Build Information');
    await expect(topology.getByRole('columnheader', { name: /partition 1/i })).toBeVisible();
    await expect(nodeRow).toContainText('127.0.0.1:8091');
    await expect(nodeRow.getByText('Leader', { exact: true })).toBeVisible();

    const sectionOrder = await page
      .locator('[data-testid="system-cluster-topology"], [data-testid="system-build-information"]')
      .evaluateAll((sections) => sections.map((section) => section.getAttribute('data-testid')));
    expect(sectionOrder).toEqual(['system-cluster-topology', 'system-build-information']);
    await expect(page.getByTestId('system-status-page').locator(':scope > :last-child'))
      .toHaveAttribute('data-testid', 'system-build-information');
    await expect(frontend).toHaveCSS('border-left-color', 'rgb(240, 240, 240)');
    await page.setViewportSize({ width: 600, height: 900 });
    await expect(frontend).toHaveCSS('border-top-color', 'rgb(240, 240, 240)');

    await expect(backend).toContainText('ZenBPM');
    await expect(backend).toContainText(new RegExp(`Version\\s*v${escapedVersion}`));
    await expect(backend).toContainText(/Build Time\s*2026-08-10T07:33:20Z/);
    await expect(backend).toContainText(/Branch\s*main/);
    await expect(backend).toContainText(new RegExp(`Commit ID\\s*${e2eShortCommit}`));

    await expect(frontend).toContainText('UI');
    await expect(frontend).toContainText(new RegExp(`Version\\s*${escapedVersion}`));
    await expect(frontend).toContainText(new RegExp(`Build Time\\s*${e2eBuildMetadata.time}`));
    await expect(frontend).toContainText(new RegExp(`Branch\\s*${e2eBuildMetadata.branch}`));
    await expect(frontend).toContainText(new RegExp(`Commit ID\\s*${e2eShortCommit}`));
  });

  test('shows only available fields from a partial status response', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    await page.goto('/');
    await page.getByRole('link', { name: 'System Status' }).click();
    const statusPage = page.getByTestId('system-status-page');
    await expect(statusPage).toBeVisible();
    await page.evaluate(() => {
      window.history.replaceState(
        window.history.state,
        '',
        '/system-status?systemStatusScenario=malformed',
      );
    });
    await page.getByRole('button', { name: 'Refresh' }).click();

    const backend = page.getByTestId('backend-build-information');
    await expect(statusPage).toContainText(/3\s*Desired Partitions/i);
    await expect(backend).toContainText(/Branch\s*main/);
    await expect(backend).toContainText(new RegExp(`Commit ID\\s*${e2eShortCommit}`));
    await expect(backend.getByText('Version', { exact: true })).toHaveCount(0);
    await expect(backend.getByText('Build Time', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('alert')).toHaveCount(0);
    await expect(page.getByText('Unexpected Application Error!')).not.toBeVisible();
    expect(pageErrors).toEqual([]);
  });
});
