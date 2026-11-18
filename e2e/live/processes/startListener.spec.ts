import { expect, test } from '@playwright/test';
import { appendElement, createProcess, selectShape } from '../helpers/processDesigner.ts';
import { addListener } from '../helpers/executionListeners.ts';
import {
  completeJob,
  deployAndStartDesignedProcess,
  enterVariables,
  instanceState,
  instanceVariables,
  waitForJobRow,
} from '../helpers/listenerProcesses.ts';

const LISTENER_TYPE = 'order-started';

// The engine holds the token at a start event with an end execution listener
// until a worker completes the listener's job. The UI marks that job and says
// that what it is completed with is written to the instance, which it is.
test('a start event listener holds the token until the UI completes its job', async ({ page }) => {
  await createProcess(page);
  await appendElement(page, 'Start', 'Append end event', 'End');
  await selectShape(page, 'Start');
  await addListener(page, 'Start', { eventType: 'end', type: LISTENER_TYPE });
  const instanceKey = await deployAndStartDesignedProcess(page);

  const row = await waitForJobRow(page, LISTENER_TYPE);
  await expect(row.getByTestId('job-listener-chip')).toHaveText('End listener');

  await row.getByRole('button', { name: 'Complete' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByTestId('complete-job-listener-note')).toContainText('written to the instance');
  await enterVariables(page, '{"startedBy": "the listener"}');
  await completeJob(page, dialog);
  await expect(page.getByText('Job completed successfully')).toBeVisible();

  // With the job completed the token leaves the start event and the instance ends.
  await expect.poll(async () => instanceState(page, instanceKey), { timeout: 15_000 }).toBe('completed');
  await waitForJobRow(page, LISTENER_TYPE, 'Completed');
  expect(await instanceVariables(page, instanceKey)).toMatchObject({ startedBy: 'the listener' });
});
