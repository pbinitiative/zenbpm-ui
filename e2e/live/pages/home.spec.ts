import { expect, test, type Locator, type Page } from '@playwright/test';
import { expectAppShell } from '../supports/appAssertions.ts';
import {
  observeDecisionInstancesCall,
  observeDmnResourceDefinitionsCall,
  observeHomeStatusCall,
  observeProcessDefinitionsCall,
  observeProcessInstancesCall,
} from '../supports/homeApiAssertions.ts';

const displayedVersion = String.raw`(\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?)`;
const backendVersionPattern = new RegExp(
  `^ZenBPM:\\s+v${displayedVersion}\\s+\\([^)]+\\)$`,
);
const uiVersionPattern = new RegExp(
  `^UI:\\s+${displayedVersion}\\s+\\([^)]+\\)$`,
);

function extractDisplayedVersion(
  text: string,
  pattern: RegExp,
  label: string,
): string {
  const version = text.match(pattern)?.[1];
  if (!version) {
    throw new Error(`Could not read ${label} version from build metadata: ${text}`);
  }
  return version;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function expectLocalizedCount(
  page: Page,
  card: Locator,
  count: number,
  label: 'DEFINITIONS' | 'INSTANCES',
): Promise<void> {
  const displayedCount = await page.evaluate((value) => value.toLocaleString(), count);
  await expect(card).toContainText(
    new RegExp(`${escapeRegExp(displayedCount)}\\s*${label}`, 'i'),
  );
}

test('home page shows the application shell and introduction', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveURL(/\/$/);
  await expectAppShell(page);

  const home = page.getByTestId('home-page');
  await expect(home).toBeVisible();
  await expect(home.getByText('ZenBPM', { exact: true })).toBeVisible();
  await expect(home.getByText('Business Process Management Engine', { exact: true })).toBeVisible();
});

test('home page shows matching UI and backend versions', async ({ page }) => {
  await page.goto('/');

  const footer = page.getByTestId('build-metadata-footer');
  const backendMetadata = footer.locator('p').filter({ hasText: /^ZenBPM:/ });
  const uiMetadata = footer.locator('p').filter({ hasText: /^UI:/ });

  await expect(backendMetadata).toHaveText(backendVersionPattern);
  await expect(uiMetadata).toHaveText(uiVersionPattern);

  const backendVersion = extractDisplayedVersion(
    await backendMetadata.innerText(),
    backendVersionPattern,
    'ZenBPM',
  );
  const uiVersion = extractDisplayedVersion(
    await uiMetadata.innerText(),
    uiVersionPattern,
    'UI',
  );

  expect(
    uiVersion,
    `UI version ${uiVersion} must match ZenBPM version ${backendVersion}`,
  ).toBe(backendVersion);
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
  await expectLocalizedCount(page, processCard, processDefinitions.totalCount, 'DEFINITIONS');
  await expectLocalizedCount(page, processCard, processInstances.totalCount, 'INSTANCES');
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
  await expectLocalizedCount(
    page,
    decisionCard,
    dmnResourceDefinitions.totalCount,
    'DEFINITIONS',
  );
  await expectLocalizedCount(page, decisionCard, decisionInstances.totalCount, 'INSTANCES');
});

test('home page links to System Status', async ({ page }) => {
  await page.goto('/');

  const systemStatusLink = page.getByRole('link', { name: 'View system status', exact: true });
  await expect(systemStatusLink).toBeVisible();
  await expect(systemStatusLink).toHaveAttribute('href', '/system-status');
});
