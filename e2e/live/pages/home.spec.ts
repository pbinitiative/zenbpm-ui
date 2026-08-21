import { expect, test } from '@playwright/test';
import { expectAppShell } from '../supports/appAssertions.ts';
import {
  observeDecisionInstancesCall,
  observeDmnResourceDefinitionsCall,
  observeHomeStatusCall,
  observeProcessDefinitionsCall,
  observeProcessInstancesCall,
} from '../supports/homeApiAssertions.ts';

test('home page shows the application shell and introduction', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveURL(/\/$/);
  await expectAppShell(page);

  const home = page.getByTestId('home-page');
  await expect(home).toBeVisible();
  await expect(home.getByText('ZenBPM', { exact: true })).toBeVisible();
  await expect(home.getByText('Business Process Management Engine', { exact: true })).toBeVisible();
});

test('home page calls the system status endpoint and returns valid cluster data', async ({ page }) => {
  const statusCall = observeHomeStatusCall(page);

  await page.goto('/');
  await statusCall;
});

test('home page shows the Processes card with current API counters', async ({ page }) => {
  const processDefinitionsCall = observeProcessDefinitionsCall(page);
  const processInstancesCall = observeProcessInstancesCall(page);

  await page.goto('/');
  const [processDefinitions, processInstances] = await Promise.all([
    processDefinitionsCall,
    processInstancesCall,
  ]);

  const processCard = page.getByTestId('quick-access-card-processes');
  await expect(processCard).toBeVisible();
  await expect(processCard.getByText('Processes', { exact: true })).toBeVisible();
  await expect(processCard).toContainText(
    'Manage BPMN process definitions and view running instances',
  );
  await expect(processCard).toContainText(
    new RegExp(`${processDefinitions.totalCount}\\s*DEFINITIONS`, 'i'),
  );
  await expect(processCard).toContainText(
    new RegExp(`${processInstances.totalCount}\\s*INSTANCES`, 'i'),
  );
});

test('home page shows the Decisions card with current API counters', async ({ page }) => {
  const dmnResourceDefinitionsCall = observeDmnResourceDefinitionsCall(page);
  const decisionInstancesCall = observeDecisionInstancesCall(page);

  await page.goto('/');
  const [dmnResourceDefinitions, decisionInstances] = await Promise.all([
    dmnResourceDefinitionsCall,
    decisionInstancesCall,
  ]);

  const decisionCard = page.getByTestId('quick-access-card-decisions');
  await expect(decisionCard).toBeVisible();
  await expect(decisionCard.getByText('Decisions', { exact: true })).toBeVisible();
  await expect(decisionCard).toContainText(
    'Manage DMN decision definitions and evaluate decisions',
  );
  await expect(decisionCard).toContainText(
    new RegExp(`${dmnResourceDefinitions.totalCount}\\s*DEFINITIONS`, 'i'),
  );
  await expect(decisionCard).toContainText(
    new RegExp(`${decisionInstances.totalCount}\\s*INSTANCES`, 'i'),
  );
});

test('home page links to System Status', async ({ page }) => {
  await page.goto('/');

  const systemStatusLink = page.getByRole('link', { name: 'View system status', exact: true });
  await expect(systemStatusLink).toBeVisible();
  await expect(systemStatusLink).toHaveAttribute('href', '/system-status');
});
