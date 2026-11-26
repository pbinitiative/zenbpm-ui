import { test, expect, type Locator, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const FIXTURE_DIR = fileURLToPath(new URL('./fixtures', import.meta.url));
const FIXTURE_BPMN = path.join(FIXTURE_DIR, 'timer-feel-expression.bpmn');
const LITERAL_TIMER = 'timer-literal';
const EXPRESSION_TIMER = 'timer-expression';
const FEEL_ON = 'Click to set a dynamic value with FEEL expression';
const FEEL_OFF = 'Click to remove dynamic value with FEEL expression';

test.describe('Process Designer — Timer value as a static value or a FEEL expression', () => {
  test('shows a literal in a plain input and an expression in the FEEL editor', async ({ page }) => {
    await openDesignerWithFixture(page);

    await selectTimer(page, LITERAL_TIMER);
    await expect(timerType(page)).toHaveValue('timeDuration');
    await expect(timerType(page).locator('option')).toHaveText(['<none>', 'Date', 'Duration', 'Cycle']);
    await expect(staticValue(page)).toHaveValue('PT15M');
    await expect(feelValue(page)).toHaveCount(0);
    await expect(valueEntry(page).getByTitle(FEEL_ON, { exact: true })).toBeVisible();

    await selectTimer(page, EXPRESSION_TIMER);
    await expect(timerType(page)).toHaveValue('timeDate');
    await expect(feelValue(page)).toHaveText('dueAt');
    await expect(staticValue(page)).toHaveCount(0);
    await expect(valueEntry(page).getByTitle(FEEL_OFF, { exact: true })).toBeVisible();
  });

  test('turns a static value into a FEEL expression and persists it into the BPMN XML', async ({ page }) => {
    const fileInput = await openDesignerWithFixture(page);

    await selectTimer(page, LITERAL_TIMER);
    await valueEntry(page).getByTitle(FEEL_ON, { exact: true }).click();
    await expect(feelValue(page)).toHaveText('PT15M');
    await replaceFeelValue(page, feelValue(page), 'date and time(sentAt) - date and time(startedAt)');

    // An unparsable expression is flagged by the FEEL editor.
    await selectTimer(page, EXPRESSION_TIMER);
    await replaceFeelValue(page, feelValue(page), 'dueAt +');
    await expect(valueEntry(page).locator('.bio-properties-panel-error')).toHaveText('Unparsable FEEL expression.');
    await replaceFeelValue(page, feelValue(page), 'date and time(sentAt) + duration("P3D")');
    await expect(valueEntry(page).locator('.bio-properties-panel-error')).toHaveCount(0);

    const xml = await downloadXml(page);
    expect(await readTimerValues(page, xml)).toEqual({
      [LITERAL_TIMER]: { timeDuration: '=date and time(sentAt) - date and time(startedAt)' },
      [EXPRESSION_TIMER]: { timeDate: '=date and time(sentAt) + duration("P3D")' },
    });

    // Re-import the exported XML and verify the expressions survive the round-trip.
    const previousShape = await page.locator(`[data-element-id="${LITERAL_TIMER}"]`).elementHandle();
    await fileInput.setInputFiles({
      name: 'exported.bpmn',
      mimeType: 'application/xml',
      buffer: Buffer.from(xml, 'utf-8'),
    });
    if (previousShape) {
      await expect.poll(() => previousShape.evaluate((element) => element.isConnected)).toBe(false);
    }
    await selectTimer(page, LITERAL_TIMER);
    await expect(feelValue(page)).toHaveText('date and time(sentAt) - date and time(startedAt)');
    await selectTimer(page, EXPRESSION_TIMER);
    await expect(feelValue(page)).toHaveText('date and time(sentAt) + duration("P3D")');
  });

  test('turns a FEEL expression back into a static value', async ({ page }) => {
    await openDesignerWithFixture(page);

    await selectTimer(page, EXPRESSION_TIMER);
    await valueEntry(page).getByTitle(FEEL_OFF, { exact: true }).click();
    await expect(staticValue(page)).toHaveValue('dueAt');
    await expect(feelValue(page)).toHaveCount(0);
    await staticValue(page).fill('2030-01-01T12:00:00Z');
    await staticValue(page).press('Tab');

    const xml = await downloadXml(page);
    expect((await readTimerValues(page, xml))[EXPRESSION_TIMER]).toEqual({ timeDate: '2030-01-01T12:00:00Z' });
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

/** Selects a timer event and opens its Timer group. */
async function selectTimer(page: Page, elementId: string) {
  const shape = page.locator(`[data-element-id="${elementId}"]`);
  await expect(shape).toBeVisible({ timeout: 10000 });
  await shape.click();
  const group = page.locator('[data-group-id="group-timer"]');
  await expect(group).toBeVisible({ timeout: 10000 });
  await expect(page.locator('.bio-properties-panel-header-label')).toHaveText(elementId);
  const entries = group.locator('.bio-properties-panel-group-entries');
  if (!(await entries.evaluate((el) => el.classList.contains('open')))) {
    await group.locator('.bio-properties-panel-group-header').click();
  }
  await expect(entries).toHaveClass(/\bopen\b/);
}

function timerType(page: Page) {
  return page.locator('[data-entry-id="timerEventDefinitionType"] select');
}

function valueEntry(page: Page) {
  return page.locator('[data-entry-id="timerEventDefinitionValue"]');
}

function staticValue(page: Page) {
  return valueEntry(page).locator('input.bio-properties-panel-input');
}

/** The FEEL editor; a plain input has the textbox role only implicitly, so it does not match. */
function feelValue(page: Page) {
  return valueEntry(page).locator('[role="textbox"]');
}

/** Replaces the content of a FEEL editor, which is a CodeMirror editor and not an input. */
async function replaceFeelValue(page: Page, editor: Locator, value: string) {
  // CodeMirror chooses shortcuts from navigator.platform, independently of the emulated user agent.
  const selectAll = await page.evaluate(() => (/Mac/.test(navigator.platform) ? 'Meta+A' : 'Control+A'));
  await editor.click();
  await editor.press(selectAll);
  await editor.pressSequentially(value);
  await editor.press('Tab');
  await expect(editor).toHaveText(value);
}

async function downloadXml(page: Page) {
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /^download$/i }).click(),
  ]);
  const downloadPath = await download.path();
  expect(downloadPath).toBeTruthy();
  return readFile(downloadPath!, 'utf-8');
}

/** Reads the timer value of each intermediate catch event, keyed by the kind of value it is. */
async function readTimerValues(page: Page, xml: string) {
  return page.evaluate((xml) => {
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    const values: Record<string, Record<string, string | null>> = {};
    for (const event of Array.from(doc.querySelectorAll('intermediateCatchEvent'))) {
      const timer = event.querySelector(':scope > timerEventDefinition');
      values[event.getAttribute('id') ?? ''] = Object.fromEntries(
        Array.from(timer?.children ?? []).map((child) => [child.localName, child.textContent]),
      );
    }
    return values;
  }, xml);
}
