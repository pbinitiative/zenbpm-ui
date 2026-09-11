import { test, expect, type Locator, type Page, type Request } from '@playwright/test';
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
    await expect(table.getByText('timerBoundaryEvent').first()).toBeVisible();
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

test.describe('Process Instance Detail - Event Subscription States', () => {
  test('lists message subscriptions in every state by default', async ({ page }) => {
    await page.goto(`/process-instances/${ACTIVE_INSTANCE_KEY}?tab=events&eventType=messages`);
    const table = page.getByTestId('message-subscriptions-table');
    await expect(table).toBeVisible({ timeout: 10000 });

    // Active, completed and terminated subscriptions are all listed
    await expect(table.getByText('OrderConfirmed')).toBeVisible();
    await expect(table.getByText('OrderShipped')).toBeVisible();
    await expect(table.getByText('OrderCancelled')).toBeVisible();

    // The state filter has "All" selected rather than a preselected state
    await expectAllStatesSelected(page, page.getByTestId('event-subscriptions-messages-panel'));
  });

  test('does not send a state filter for the table request by default', async ({ page }) => {
    const unfilteredRequest = page.waitForRequest((request) => isMessageSubscriptionsRequest(request, null));
    await page.goto(`/process-instances/${ACTIVE_INSTANCE_KEY}?tab=events&eventType=messages`);
    await unfilteredRequest;
  });

  test('shows the state of every message subscription row', async ({ page }) => {
    await page.goto(`/process-instances/${ACTIVE_INSTANCE_KEY}?tab=events&eventType=messages`);
    const table = page.getByTestId('message-subscriptions-table');
    await expect(table).toBeVisible({ timeout: 10000 });

    await expect(table.locator('tbody [data-testid="state-badge-active"]')).toHaveCount(2);
    await expect(table.locator('tbody [data-testid="state-badge-completed"]')).toHaveCount(1);
    await expect(table.locator('tbody [data-testid="state-badge-terminated"]')).toHaveCount(1);

    const completedRow = table.locator('tbody tr').filter({ hasText: 'OrderShipped' });
    await expect(completedRow.getByText('Completed')).toBeVisible();
    const terminatedRow = table.locator('tbody tr').filter({ hasText: 'OrderCancelled' });
    await expect(terminatedRow.getByText('Terminated')).toBeVisible();
  });

  test('narrows the list to the selected state and back to all', async ({ page }) => {
    await page.goto(`/process-instances/${ACTIVE_INSTANCE_KEY}?tab=events&eventType=messages`);
    const table = page.getByTestId('message-subscriptions-table');
    await expect(table.getByText('OrderShipped')).toBeVisible({ timeout: 10000 });
    const messagesPanel = page.getByTestId('event-subscriptions-messages-panel');

    // Narrowing happens server-side: the selected state is sent as the
    // request's state filter rather than being applied to the "all" rows.
    const completedRequest = page.waitForRequest((request) => isMessageSubscriptionsRequest(request, 'completed'));
    await messagesPanel.getByRole('combobox').first().click();
    await page.getByRole('option', { name: /completed/i }).click();
    await completedRequest;
    await expect(table.getByText('OrderConfirmed')).toHaveCount(0);
    await expect(table.getByText('OrderCancelled')).toHaveCount(0);
    await expect(table.getByText('OrderShipped')).toBeVisible();

    // Going back to "All" drops the state filter from the request again
    const unfilteredRequest = page.waitForRequest((request) => isMessageSubscriptionsRequest(request, null));
    await messagesPanel.getByRole('combobox').first().click();
    await page.getByRole('option', { name: /^all$/i }).click();
    await unfilteredRequest;
    await expect(table.getByText('OrderConfirmed')).toBeVisible();
    await expect(table.getByText('OrderShipped')).toBeVisible();
    await expect(table.getByText('OrderCancelled')).toBeVisible();
  });

  test('offers Trigger only for active message subscriptions', async ({ page }) => {
    await page.goto(`/process-instances/${ACTIVE_INSTANCE_KEY}?tab=events&eventType=messages`);
    const table = page.getByTestId('message-subscriptions-table');
    await expect(table.getByText('OrderShipped')).toBeVisible({ timeout: 10000 });

    const activeRow = table.locator('tbody tr').filter({ hasText: 'OrderConfirmed' });
    await expect(activeRow.getByRole('button', { name: /trigger/i })).toBeVisible();

    const completedRow = table.locator('tbody tr').filter({ hasText: 'OrderShipped' });
    await expect(completedRow.getByRole('button', { name: /trigger/i })).toHaveCount(0);
    const terminatedRow = table.locator('tbody tr').filter({ hasText: 'OrderCancelled' });
    await expect(terminatedRow.getByRole('button', { name: /trigger/i })).toHaveCount(0);
  });

  test('lists timer subscriptions in every state with timer-specific labels', async ({ page }) => {
    await page.goto(`/process-instances/${ACTIVE_INSTANCE_KEY}?tab=events&eventType=timers`);
    const table = page.getByTestId('timer-subscriptions-table');
    await expect(table).toBeVisible({ timeout: 10000 });

    // Count state badges rather than raw rows: sectioned tables add header
    // rows for child instances, which are not subscriptions.
    await expect(table.locator('tbody [data-testid^="state-badge-"]')).toHaveCount(3);
    await expect(table.locator('tbody [data-testid="state-badge-active"]')).toHaveCount(1);
    await expect(table.locator('tbody [data-testid="state-badge-completed"]')).toHaveCount(1);
    await expect(table.locator('tbody [data-testid="state-badge-withdrawn"]')).toHaveCount(1);

    // Timer states use their own wording, matching the filter options
    await expect(table.getByText('Created')).toBeVisible();
    await expect(table.getByText('Triggered')).toBeVisible();
    await expect(table.getByText('Cancelled')).toBeVisible();
  });

  test('lists error subscriptions in every state', async ({ page }) => {
    await page.goto(`/process-instances/${ACTIVE_INSTANCE_KEY}?tab=events&eventType=errors`);
    const table = page.getByTestId('error-subscriptions-table');
    await expect(table).toBeVisible({ timeout: 10000 });

    await expect(table.getByText('ORDER_FAILED')).toBeVisible();
    await expect(table.getByText('PAYMENT_DECLINED')).toBeVisible();
    const withdrawnRow = table.locator('tbody tr').filter({ hasText: 'PAYMENT_DECLINED' });
    await expect(withdrawnRow.getByText('Cancelled')).toBeVisible();
  });

  test('labels the Event Subscriptions tab badge as an active-only count', async ({ page }) => {
    await page.goto(`/process-instances/${ACTIVE_INSTANCE_KEY}?tab=events&eventType=messages`);
    // Mocks: 2 active messages + 1 active timer + 1 active error = 4, while
    // 9 subscriptions exist across all states. The chip's accessible name
    // qualifies the number so it is not mistaken for the tab's total.
    const tab = page.getByRole('tab', { name: /event subscriptions 4 active$/i });
    await expect(tab).toBeVisible({ timeout: 10000 });

    await tab.getByText('4', { exact: true }).hover();
    await expect(page.getByRole('tooltip')).toContainText(/active event subscriptions/i);
  });
});

/**
 * Whether `request` lists message subscriptions with exactly the given
 * `state` query param. `null` matches a request that sends no state filter
 * at all, i.e. one that asks the server for every state.
 */
function isMessageSubscriptionsRequest(request: Request, state: string | null): boolean {
  const url = new URL(request.url());
  return url.pathname.endsWith('/event-subscriptions/messages') && url.searchParams.get('state') === state;
}

/**
 * Positively assert that the state filter of a subscriptions panel has "All"
 * selected. The closed select renders no text for the empty value, so the
 * selection is checked on the opened dropdown's "All" option instead.
 */
async function expectAllStatesSelected(page: Page, panel: Locator) {
  await panel.getByRole('combobox').first().click();
  const allOption = page.getByRole('option', { name: /^all$/i });
  await expect(allOption).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('Escape');
  await expect(allOption).toBeHidden();
}
