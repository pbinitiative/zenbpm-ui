import { expect, type Locator, type Page } from '@playwright/test';

type ManagementSection = 'Processes' | 'Decisions';

const semanticVersion = String.raw`\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?`;
const commitId = String.raw`(?:[0-9a-f]{7,40}|unknown)`;

function exactCaseInsensitive(value: string): RegExp {
  return new RegExp(`^${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
}

export async function expectAppShell(page: Page): Promise<void> {
  await expect(page).toHaveTitle('zenbpm-ui');

  const header = page.locator('header');
  await expect(header.getByText('ZenBPM', { exact: true })).toBeVisible();

  for (const item of ['Processes', 'Decisions', 'Design']) {
    await expect(header.getByRole('button', { name: item, exact: true })).toBeEnabled();
  }

  await expect(header.getByText('JD', { exact: true })).toBeVisible();

  const footer = page.getByTestId('build-metadata-footer');
  await expect(footer).toBeVisible();
  await expect(footer).toContainText(
    new RegExp(`ZenBPM:\\s+v${semanticVersion}\\s+\\(${commitId}\\)`),
  );
  await expect(footer).toContainText(
    new RegExp(`UI:\\s+${semanticVersion}\\s+\\(${commitId}\\)`),
  );
}

export async function expectManagementPageHeader(
  page: Page,
  section: ManagementSection,
): Promise<void> {
  await expect(page.getByRole('heading', { level: 1, name: section, exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Definitions', exact: true })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Instances', exact: true })).toBeEnabled();
}

export async function expectManagementActions(
  page: Page,
  section: ManagementSection,
): Promise<void> {
  const actions = section === 'Processes'
    ? [
        ['refresh-button', 'Refresh'],
        ['upload-button', 'Upload BPMN'],
        ['design-button', 'Design Process'],
        ['start-instance-button', 'Start Instance'],
      ]
    : [
        ['refresh-button', 'Refresh'],
        ['upload-button', 'Upload DMN'],
        ['design-button', 'Design Decision'],
      ];

  for (const [testId, label] of actions) {
    const button = page.getByTestId(testId);
    await expect(button).toBeEnabled();
    await expect(button).toHaveText(label);
  }
}

export async function expectTableHeaders(
  table: Locator,
  headers: readonly string[],
): Promise<void> {
  for (const header of headers) {
    await expect(
      table.getByRole('columnheader', { name: exactCaseInsensitive(header) }),
    ).toBeVisible();
  }
}

export async function expectPagination(
  table: Locator,
  expectedPageSize: number,
): Promise<void> {
  const rowsPerPage = table.getByText('Rows per page:', { exact: true });
  await expect(rowsPerPage).toBeVisible();
  await expect(rowsPerPage.locator('..').getByRole('combobox')).toHaveText(
    String(expectedPageSize),
  );

  for (const label of [
    'Go to first page',
    'Go to previous page',
    'Go to next page',
    'Go to last page',
  ]) {
    await expect(table.getByRole('button', { name: label, exact: true })).toBeVisible();
  }

  await expect(
    table
      .getByRole('button', { name: 'page 1', exact: true })
      .or(table.getByText('No data available', { exact: true })),
  ).toBeVisible();
}

export async function expectDesignerActions(page: Page): Promise<void> {
  const diagramButton = page.getByRole('button', { name: 'Diagram', exact: true });
  const xmlButton = page.getByRole('button', { name: 'XML', exact: true });

  await expect(diagramButton).toBeEnabled();
  await expect(diagramButton).toHaveAttribute('value', 'diagram');
  await expect(xmlButton).toBeEnabled();
  await expect(xmlButton).toHaveAttribute('value', 'xml');

  const consoleButton = page.getByRole('button', { name: /Console/ });
  await expect(consoleButton).toBeEnabled();
  await expect(consoleButton).toHaveText(/0\s*Console/);

  for (const label of ['Import', 'Download', 'Deploy']) {
    await expect(page.getByRole('button', { name: label, exact: true })).toBeEnabled();
  }
}

export async function expectVisibleTitles(page: Page, titles: readonly string[]): Promise<void> {
  for (const title of titles) {
    await expect(page.getByTitle(title, { exact: true })).toBeVisible();
  }
}
