import { expect, type Page } from '@playwright/test';

export async function openEventSubscriptionsTab(page: Page): Promise<void> {
  await page.getByTestId('process-instance-tab-event-subscriptions').click();
}

export async function openJobsTab(page: Page): Promise<void> {
  await page.getByTestId('process-instance-tab-jobs').click();
}

export async function triggerMessageSubscription(
  page: Page,
  elementId: string,
  correlationKey?: string
): Promise<void> {
  const row = page.locator('tr').filter({ hasText: elementId });
  await expect(row).toBeVisible();

  await row.getByRole('button', { name: 'Trigger' }).click();

  const dialog = page.getByRole('dialog', { name: 'Trigger Message' });
  await expect(dialog).toBeVisible();

  if (correlationKey) {
    await dialog.getByLabel('Correlation Key').fill(correlationKey);
  }

  await dialog.getByRole('button', { name: 'Send Message' }).click();
}
