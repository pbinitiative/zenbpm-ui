import { expect, test } from '@playwright/test';
import { getLiveDeploymentManifest } from '../helpers/liveEnvironment.ts';

test('global setup deploys run-scoped BPMN processes', async ({ page }) => {
  const manifest = getLiveDeploymentManifest();
  const deployedProcesses = [manifest.gateway, manifest.sales];

  for (const process of deployedProcesses) {
    expect(process.processName).toMatch(new RegExp(`^${manifest.runPrefix}`));
    expect(process.processId).toMatch(new RegExp(`^e2e_${manifest.runPrefix}`));
  }

  await page.goto('/processes/definitions?onlyLatest=true');

  const table = page.getByTestId('process-definitions-table');
  const search = table.getByLabel('Search', { exact: true });

  for (const process of deployedProcesses) {
    await search.fill(process.processName);

    const uploadedProcessRow = table.getByRole('row').filter({
      hasText: process.processName,
    });

    await expect(uploadedProcessRow).toHaveCount(1, { timeout: 30_000 });
    await expect(uploadedProcessRow.getByTestId('cell-bpmnProcessName')).toHaveText(
      process.processName,
    );
    await expect(uploadedProcessRow.getByTestId('cell-bpmnProcessId')).toHaveText(
      process.processId,
    );
    await expect(uploadedProcessRow.getByTestId('cell-version')).toHaveText(/^v\d+$/);
  }
});
