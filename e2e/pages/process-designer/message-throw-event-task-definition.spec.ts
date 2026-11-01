import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const FIXTURE_DIR = fileURLToPath(new URL('./fixtures', import.meta.url));
const FIXTURE_BPMN = path.join(FIXTURE_DIR, 'message-throw-event-no-type.bpmn');
const ELEMENT_ID = 'message-throw';

test.describe('Process Designer — Message intermediate throw event Task definition', () => {
  test('shows Task definition instead of Message and persists Type and Retries into the BPMN XML', async ({ page }) => {
    const fileInput = await openDesignerWithFixture(page);
    await selectThrowEvent(page);

    // The stock Message group (global message reference) is not offered:
    // the engine executes the event as a job, like a Send Task.
    await expect(page.locator('[data-group-id="group-message"]')).toHaveCount(0);

    await openTaskDefinitionGroup(page);
    const typeInput = entryInput(page, 'zenbpm-taskDef-type');
    const retriesInput = entryInput(page, 'zenbpm-taskDef-retries');
    await expect(typeInput).toHaveValue('');
    await expect(retriesInput).toHaveValue('');

    // Text fields commit on blur.
    await typeInput.fill('notify-worker');
    await typeInput.press('Tab');
    await retriesInput.fill('3');
    await retriesInput.press('Tab');
    await expect(typeInput).toHaveValue('notify-worker');
    await expect(retriesInput).toHaveValue('3');

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /^download$/i }).click(),
    ]);
    const downloadPath = await download.path();
    expect(downloadPath).toBeTruthy();
    const xml = await readFile(downloadPath!, 'utf-8');

    expect(await readThrowEventXml(page, xml)).toEqual({
      taskDefinitions: [{ type: 'notify-worker', retries: '3' }],
      eventDefinitions: ['messageEventDefinition'],
    });

    // Re-import the exported XML and verify the values survive the round-trip.
    await fileInput.setInputFiles({
      name: 'exported.bpmn',
      mimeType: 'application/xml',
      buffer: Buffer.from(xml, 'utf-8'),
    });
    await selectThrowEvent(page);
    await expect(page.locator('[data-group-id="group-message"]')).toHaveCount(0);
    await openTaskDefinitionGroup(page);
    await expect(entryInput(page, 'zenbpm-taskDef-type')).toHaveValue('notify-worker');
    await expect(entryInput(page, 'zenbpm-taskDef-retries')).toHaveValue('3');
  });
});

async function openDesignerWithFixture(page: Page) {
  await page.goto('/designer/process');
  await expect(page.getByTestId('process-designer-page')).toBeVisible();
  await expect(page.locator('.bjs-container')).toBeVisible({ timeout: 15000 });
  const fileInput = page.getByTestId('process-designer-file-input');
  await fileInput.setInputFiles(FIXTURE_BPMN);
  return fileInput;
}

async function selectThrowEvent(page: Page) {
  const shape = page.locator(`[data-element-id="${ELEMENT_ID}"]`);
  await expect(shape).toBeVisible({ timeout: 10000 });
  await shape.click();
  // Wait for the panel to render the element-specific groups.
  await expect(page.locator('[data-group-id="group-general"]')).toBeVisible({ timeout: 10000 });
}

async function openTaskDefinitionGroup(page: Page) {
  const group = page.locator('[data-group-id="group-zenbpm-taskDefinition"]');
  await expect(group).toBeVisible({ timeout: 10000 });
  const entries = group.locator('.bio-properties-panel-group-entries');
  if (!(await entries.evaluate((el) => el.classList.contains('open')))) {
    await group.locator('.bio-properties-panel-group-header').click();
  }
  await expect(entries).toHaveClass(/\bopen\b/);
  return group;
}

function entryInput(page: Page, entryId: string) {
  return page.locator(`[data-entry-id="${entryId}"] input.bio-properties-panel-input`);
}

/** Reads the throw event's task definitions and event definitions, independent of attribute order. */
async function readThrowEventXml(page: Page, xml: string) {
  return page.evaluate(({ xml, id }) => {
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    const event = doc.querySelector(`intermediateThrowEvent[id="${id}"]`);
    return {
      taskDefinitions: Array.from(event?.querySelectorAll(':scope > extensionElements > taskDefinition') ?? [])
        .map((node) => ({ type: node.getAttribute('type'), retries: node.getAttribute('retries') })),
      eventDefinitions: Array.from(event?.children ?? [])
        .map((child) => child.localName)
        .filter((name) => name.endsWith('EventDefinition')),
    };
  }, { xml, id: ELEMENT_ID });
}
