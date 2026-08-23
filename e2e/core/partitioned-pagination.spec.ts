import { test, expect } from '@playwright/test';

const PROCESS_DEFINITION_KEY = '3000000000000000033';

test('partitioned pagination uses the largest partition total', async ({ page }) => {
  const requestedPages: number[] = [];

  await page.goto(`/process-definitions/${PROCESS_DEFINITION_KEY}`);
  await expect(page.getByText('Process Instances')).toBeVisible();

  await page.evaluate(async () => {
    // The Vite-served module is available in the browser, not to Playwright's Node type resolver.
    // @ts-expect-error browser-only module URL
    const { worker } = await import('/src/mocks/browser.ts');
    worker.stop();
  });

  await page.route('**/v1/process-instances**', async (route) => {
    const requestedPage = Number(new URL(route.request().url()).searchParams.get('page') ?? '1');
    requestedPages.push(requestedPage);

    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(createPartitionedResponse(requestedPage)),
    });
  });

  const stateFilter = page.locator('.MuiFormControl-root').filter({ hasText: 'State' }).first();
  await stateFilter.click();
  await page.getByRole('option', { name: 'Active' }).click();

  await expect.poll(() => requestedPages).toContain(1);

  await expect(page.getByRole('button', { name: 'Go to page 3' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Go to page 4' })).toHaveCount(0);

  await page.getByRole('button', { name: 'Go to page 3' }).click();
  await expect.poll(() => requestedPages).toContain(3);
});

function createPartitionedResponse(page: number) {
  const partitionTotals = [12, 4, 9];

  return {
    partitions: partitionTotals.map((totalCount, index) => ({
      partition: index + 1,
      totalCount,
      items: page === 1 || totalCount > (page - 1) * 5
        ? [{
            key: `310000000000000000${index}`,
            processDefinitionKey: PROCESS_DEFINITION_KEY,
            bpmnProcessId: 'showcase-process',
            createdAt: '2026-08-23T12:00:00Z',
            state: 'active',
            processType: 'default',
            variables: {},
            incidentCount: 0,
          }]
        : [],
    })),
    page,
    size: 5,
    count: partitionTotals.filter((totalCount) => page === 1 || totalCount > (page - 1) * 5).length,
    totalCount: partitionTotals.reduce((sum, totalCount) => sum + totalCount, 0),
  };
}

