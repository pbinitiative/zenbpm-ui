import { test, expect } from '@playwright/test';
import { instanceKeys } from '../../fixtures/instance-keys';

const { ACTIVE_INSTANCE_KEY } = instanceKeys;

test.describe('Process Instance Detail - Event Subscriptions Tab', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/process-instances/${ACTIVE_INSTANCE_KEY}?tab=event-subscriptions`);
    await expect(page.getByText('Instance Details')).toBeVisible({ timeout: 10000 });
  });

  test('should show Event Subscriptions tab', async ({ page }) => {
    await expect(page.getByRole('tab', { name: /event subscriptions/i })).toBeVisible();
  });

  test('should display the event subscriptions tab content when navigated to', async ({ page }) => {
    await expect(page.getByTestId('event-subscriptions-tab')).toBeVisible({ timeout: 5000 });
  });

  test('should display Messages section header', async ({ page }) => {
    await page.getByRole('tab', { name: /event subscriptions/i }).click();
    await expect(page.getByTestId('event-subscriptions-tab')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/messages/i).first()).toBeVisible();
  });

  test('should display Timers section header', async ({ page }) => {
    await page.getByRole('tab', { name: /event subscriptions/i }).click();
    await expect(page.getByTestId('event-subscriptions-tab')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/timers/i).first()).toBeVisible();
  });

  test('should display Errors section header', async ({ page }) => {
    await page.getByRole('tab', { name: /event subscriptions/i }).click();
    await expect(page.getByTestId('event-subscriptions-tab')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/errors/i).first()).toBeVisible();
  });

  test('should display message subscriptions table', async ({ page }) => {
    await page.getByRole('tab', { name: /event subscriptions/i }).click();
    await expect(page.getByTestId('message-subscriptions-table')).toBeVisible({ timeout: 5000 });
  });

  test('should display timer subscriptions table', async ({ page }) => {
    await page.getByRole('tab', { name: /event subscriptions/i }).click();
    await page.getByTestId('event-subscriptions-tab').getByRole('button', { name: /^timers/i }).click();
    await expect(page.getByTestId('timer-subscriptions-table')).toBeVisible({ timeout: 5000 });
  });

  test('should display error subscriptions table', async ({ page }) => {
    await page.getByRole('tab', { name: /event subscriptions/i }).click();
    await page.getByTestId('event-subscriptions-tab').getByRole('button', { name: /^errors/i }).click();
    await expect(page.getByTestId('error-subscriptions-table')).toBeVisible({ timeout: 5000 });
  });

  test('should show mock message subscription data (OrderConfirmed)', async ({ page }) => {
    await page.getByRole('tab', { name: /event subscriptions/i }).click();
    const table = page.getByTestId('message-subscriptions-table');
    await expect(table).toBeVisible({ timeout: 5000 });
    await expect(table.getByText('OrderConfirmed')).toBeVisible();
  });

  test('should show mock timer subscription data (timerBoundaryEvent)', async ({ page }) => {
    await page.getByRole('tab', { name: /event subscriptions/i }).click();
    await page.getByTestId('event-subscriptions-tab').getByRole('button', { name: /^timers/i }).click();
    const table = page.getByTestId('timer-subscriptions-table');
    await expect(table).toBeVisible({ timeout: 5000 });
    await expect(table.getByText('timerBoundaryEvent')).toBeVisible();
  });

  test('should show mock error subscription data (ORDER_FAILED)', async ({ page }) => {
    await page.getByRole('tab', { name: /event subscriptions/i }).click();
    await page.getByTestId('event-subscriptions-tab').getByRole('button', { name: /^errors/i }).click();
    const table = page.getByTestId('error-subscriptions-table');
    await expect(table).toBeVisible({ timeout: 5000 });
    await expect(table.getByText('ORDER_FAILED')).toBeVisible();
  });

  test('should show Trigger button for active message subscriptions', async ({ page }) => {
    await page.getByRole('tab', { name: /event subscriptions/i }).click();
    const table = page.getByTestId('message-subscriptions-table');
    await expect(table).toBeVisible({ timeout: 5000 });
    const triggerButton = table.getByRole('button', { name: /trigger/i });
    await expect(triggerButton.first()).toBeVisible();
  });

  test('should show badge count on Event Subscriptions tab', async ({ page }) => {
    // The tab badge should reflect a non-zero count since mock data has subscriptions.
    // The count is appended to the tab's accessible name (e.g. "Event Subscriptions 3")
    await expect(page.getByRole('tab', { name: /event subscriptions \d+/i })).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Process Instance Detail - Trigger Message Dialog', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/process-instances/${ACTIVE_INSTANCE_KEY}?tab=event-subscriptions`);
    await expect(page.getByTestId('event-subscriptions-tab')).toBeVisible({ timeout: 10000 });
  });

  test('should open Trigger Message dialog when Trigger button is clicked', async ({ page }) => {
    const triggerButton = page
      .getByTestId('message-subscriptions-table')
      .getByRole('button', { name: /trigger/i })
      .first();
    await expect(triggerButton).toBeVisible({ timeout: 5000 });
    await triggerButton.click();

    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3000 });
  });

  test('should pre-populate message name and correlation key in the dialog', async ({ page }) => {
    await page
      .getByTestId('message-subscriptions-table')
      .getByRole('button', { name: /trigger/i })
      .first()
      .click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 3000 });

    // Message name field should be pre-populated (read-only)
    await expect(dialog.getByLabel('Message Name')).toHaveValue('OrderConfirmed');
    // Correlation key should be pre-populated
    await expect(dialog.getByLabel('Correlation Key')).toHaveValue('CUST-001');
  });

  test('should close the dialog when Cancel is clicked', async ({ page }) => {
    await page
      .getByTestId('message-subscriptions-table')
      .getByRole('button', { name: /trigger/i })
      .first()
      .click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 3000 });

    await dialog.getByRole('button', { name: /cancel/i }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('should show JSON validation error for invalid variables input', async ({ page }) => {
    await page
      .getByTestId('message-subscriptions-table')
      .getByRole('button', { name: /trigger/i })
      .first()
      .click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 3000 });

    // Fill in invalid JSON via the Monaco editor (click + select-all + type)
    const monacoEditor = dialog.locator('.monaco-editor').first();
    await monacoEditor.click();
    await page.keyboard.press('Control+a');
    await page.keyboard.type('{ invalid json }');

    // Error message should appear immediately (the Send button is disabled for invalid JSON)
    await expect(dialog.getByText(/invalid json/i)).toBeVisible({ timeout: 2000 });
    // Send button should be disabled when JSON is invalid
    await expect(dialog.getByRole('button', { name: /send message/i })).toBeDisabled();
    // Dialog should remain open
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('should submit the dialog successfully with valid input', async ({ page }) => {
    await page
      .getByTestId('message-subscriptions-table')
      .getByRole('button', { name: /trigger/i })
      .first()
      .click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 3000 });

    // Leave defaults and submit
    await dialog.getByRole('button', { name: /send message/i }).click();

    // Dialog should close after successful submit (MSW returns 201)
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });
  });
});
