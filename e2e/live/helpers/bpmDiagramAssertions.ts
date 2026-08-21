import { expect, type Locator, type Page } from '@playwright/test';

export function bpmElement(page: Page, elementId: string): Locator {
  return page.locator(`[data-element-id="${elementId}"]`);
}

export async function clickBpmElement(
  page: Page,
  elementId: string,
): Promise<void> {
  const element = bpmElement(page, elementId);

  await expect(element).toBeVisible();
  await element.locator('.djs-hit').click();
}

export async function expectBpmElementVisible(
  page: Page,
  elementId: string,
): Promise<void> {
  await expect(bpmElement(page, elementId)).toBeVisible();
}

export async function expectBpmElementSelected(
  page: Page,
  elementId: string,
): Promise<void> {
  const element = bpmElement(page, elementId);

  await expect(element).toBeVisible();
  await expect(element).toHaveClass(/selected/);
}

export async function expectBpmElementContainsText(
  page: Page,
  elementId: string,
  expectedText: string,
): Promise<void> {
  const element = bpmElement(page, elementId);

  await expect(element).toBeVisible();

  const label = element.locator('.djs-label');
  await expect(label).toBeVisible();

  const text = await label.textContent();

  if (!text) {
    throw new Error(`No label text found for BPM element: ${elementId}`);
  }

  const normalizedText = text.replace(/\s+/g, ' ').trim();
  const normalizedExpectedText = expectedText.replace(/\s+/g, ' ').trim();

  expect(normalizedText).toContain(normalizedExpectedText);
}

export async function expectBpmElementCompleted(
  page: Page,
  elementId: string,
  timeout: number = 30_000,
): Promise<void> {
  const element = bpmElement(page, elementId);

  await expect(element).toBeVisible();
  await expect(element).toHaveClass(/element-completed/, { timeout });
}

export async function expectBpmElementNotCompleted(
  page: Page,
  elementId: string,
): Promise<void> {
  const element = bpmElement(page, elementId);

  await expect(element).toBeVisible();
  await expect(element).not.toHaveClass(/element-completed/);
}

export async function getBpmElementInstancesCount(
  page: Page,
  elementId: string,
): Promise<string> {
  const parentContainer = page.locator(`[data-container-id="${elementId}"]`);
  const locator = parentContainer.locator('.bpmn-overlay.count-badge.running-badge');

  if (await locator.count() === 0) {
    return '0';
  }

  return (await locator.innerText()).trim();
}

export async function expectBpmElementInstancesCount(
  page: Page,
  elementId: string,
  expectedCount: string | number,
  timeout: number = 30_000,
): Promise<string> {
  await expect
    .poll(() => getBpmElementInstancesCount(page, elementId), { timeout })
    .toBe(String(expectedCount));

  return getBpmElementInstancesCount(page, elementId);
}
