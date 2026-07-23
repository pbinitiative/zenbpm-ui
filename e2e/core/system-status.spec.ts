import { expect, test } from '@playwright/test';

test.describe('System status', () => {
  test('displays backend and frontend build information', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'System Status' }).click();
    await expect(page).toHaveURL(/\/system-status$/);

    const buildInformation = page.getByTestId('system-build-information');
    const backend = buildInformation.getByTestId('backend-build-information');
    const frontend = buildInformation.getByTestId('frontend-build-information');

    await expect(buildInformation).toContainText('Build Information');

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
    await expect(backend).toContainText(/Version\s*v1\.5\.0/);
    await expect(backend).toContainText(/Build Time\s*2026-08-10T07:33:20Z/);
    await expect(backend).toContainText(/Branch\s*main/);
    await expect(backend).toContainText(/Commit ID\s*abcdef012345/);

    await expect(frontend).toContainText('UI');
    await expect(frontend).toContainText(/Version\s*1\.5\.0/);
    await expect(frontend).toContainText(/Build Time\s*2026-08-10T08:00:00Z/);
    await expect(frontend).toContainText(/Branch\s*feat\/system-status/);
    await expect(frontend).toContainText(/Commit ID\s*abcdef012345/);
  });
});
