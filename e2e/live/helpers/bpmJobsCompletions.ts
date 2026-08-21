import { expect, type Page } from '@playwright/test';


export async function setBpmJobFilter(page: Page, random: string, label: string = 'Business Key'): Promise<void> {

  const filterInput = page.getByLabel(label, { exact: true });
  await filterInput.fill(random);

}

export async function getBpmJobCount(page: Page, random: string): Promise<number> {
  const row = page.locator('tr[data-testid="data-row"]').filter({
  has: page.locator(`td:has-text("${random}")`),
});
return await row.count();
}

export async function processBpmJobClick(page: Page, row: string, label: string = 'Complete User Task'): Promise<void> {
  const matchingRows = page.locator('tr[data-testid="data-row"]').filter({ hasText: row });
  const matchingRow = matchingRows.first();

  await expect(matchingRow).toBeVisible();
  await matchingRow.getByRole('button', { name: 'Complete', exact: true }).click();
  await expect(page.getByRole('dialog', { name: label })).toBeVisible();
}
