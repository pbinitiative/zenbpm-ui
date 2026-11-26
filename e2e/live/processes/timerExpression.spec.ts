import { expect, test, type Page } from '@playwright/test';
import { appendElement, changeElement, createProcess, selectShape } from '../helpers/processDesigner.ts';
import { editTimerExpression } from '../helpers/eventProperties.ts';
import { deployAndStartDesignedProcess } from '../helpers/listenerProcesses.ts';

const TIMER_ID = 'Wait_until';

// The engine evaluates a timer value which is a FEEL expression against the
// variables of the instance when the token reaches the event, and the timer is
// due at what it evaluated to. The instance shows that date among its timers.
// The variable names its offset, so the moment is the same whatever the time
// zone of the engine.
test('a timer whose date is a FEEL expression is due at the date a variable of the instance holds', async ({ page }) => {
  await createProcess(page);
  await appendElement(page, 'Start', 'Append intermediate/boundary event', TIMER_ID);
  await appendElement(page, TIMER_ID, 'Append end event', 'End');
  await selectShape(page, TIMER_ID);
  await changeElement(page, 'Timer intermediate catch event');
  await editTimerExpression(page, 'timeDate', 'dueAt');
  const instanceKey = await deployAndStartDesignedProcess(page, '{"dueAt": "2099-11-30T14:30:00+01:00"}');

  await page.goto(`/process-instances/${instanceKey}?tab=events&eventType=timers`);
  const row = page.getByTestId('timer-subscriptions-table').locator('tbody tr').filter({ hasText: TIMER_ID });
  await expect(row).toBeVisible({ timeout: 15_000 });
  await expect(row).toContainText('Created');
  await expect(row).toContainText(await shownDate(page, '2099-11-30T13:30:00Z'));
});

/** The moment as the page shows a date, in the time zone of the browser. */
function shownDate(page: Page, moment: string): Promise<string> {
  return page.evaluate((moment) => new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(moment)), moment);
}
