import { expect, test } from '@playwright/test';
import { expectAppShell, expectTableHeaders } from '../supports/appAssertions.ts';

test('system status page shows live cluster and build values', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'View system status', exact: true }).click();

  await expect(page).toHaveURL(/\/system-status$/);
  await expectAppShell(page);

  const status = page.getByTestId('system-status-page');
  await expect(status).toBeVisible();
  await expect(status.getByText('System Status', { exact: true })).toBeVisible();
  await expect(status).toContainText(
    'Live overview of the ZenBPM engine cluster — nodes, partitions and configuration.',
  );
  await expect(status).toContainText(/Updated at \d{1,2}:\d{2}:\d{2}/);
  await expect(status).toContainText(/\d+\s*DESIRED PARTITIONS/i);
  await expect(status).toContainText(/\d+\s*ACTIVE PARTITIONS/i);
  await expect(status).toContainText(/\d+\/\d+\s*NODES/i);
  await expect(status).toContainText(/\d+\s*RAFT LEADER/i);
  await expect(status.getByRole('button', { name: 'Refresh', exact: true })).toBeEnabled();

  const topology = page.getByTestId('system-cluster-topology');
  await expect(topology).toBeVisible();
  await expect(topology.getByText('Cluster Topology', { exact: true })).toBeVisible();
  await expect(topology.getByText('nodes × partitions', { exact: true })).toBeVisible();
  await expectTableHeaders(topology, ['NODE ID', 'ADDRESS', 'STATE', 'SUFFRAGE']);
  await expect(topology.getByRole('columnheader', { name: /PARTITION \d+/i })).toBeVisible();

  const topologyRows = topology.getByRole('row');
  await expect.poll(() => topologyRows.count()).toBeGreaterThan(1);
  const firstNodeCells = topologyRows.nth(1).getByRole('cell');
  await expect.poll(() => firstNodeCells.count()).toBeGreaterThanOrEqual(5);
  for (const cell of await firstNodeCells.all()) {
    await expect(cell).not.toHaveText(/^\s*$/);
  }

  const buildValuePattern =
    /Version\s*v?\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?\s*Build Time\s*\S+\s*Branch\s*\S+\s*Commit ID\s*\S+/i;

  const backendBuild = page.getByTestId('backend-build-information');
  await expect(backendBuild).toBeVisible();
  await expect(backendBuild.getByText('ZenBPM', { exact: true })).toBeVisible();
  await expect(backendBuild).toContainText(buildValuePattern);

  const frontendBuild = page.getByTestId('frontend-build-information');
  await expect(frontendBuild).toBeVisible();
  await expect(frontendBuild.getByText('UI', { exact: true })).toBeVisible();
  await expect(frontendBuild).toContainText(buildValuePattern);
});
