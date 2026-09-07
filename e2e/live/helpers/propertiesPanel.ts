import { expect, type Locator, type Page } from '@playwright/test';

export function propertyGroup(page: Page, id: string): Locator {
  return page.locator(`.bio-properties-panel [data-group-id="group-${id}"]`);
}

export async function openGroup(page: Page, id: string): Promise<Locator> {
  const group = propertyGroup(page, id);
  await expect(group).toBeVisible();
  const entries = group.locator('.bio-properties-panel-group-entries');
  // List groups render their entries directly, without a collapsible body.
  if (await entries.count() === 0) return group;
  if (!(await entries.getAttribute('class'))?.split(' ').includes('open')) {
    await group.locator('.bio-properties-panel-group-header').click();
  }
  await expect(entries).toHaveClass(/\bopen\b/);
  return group;
}

export function entry(page: Page, id: string): Locator {
  return page.locator(`.bio-properties-panel [data-entry-id="${id}"]`);
}

export async function fillEntry(page: Page, id: string, value: string): Promise<void> {
  const input = entry(page, id).getByRole('textbox');
  const previousValue = await input.getAttribute('contenteditable') === 'true' ? await input.textContent() : await input.inputValue();
  if (previousValue === value) return;
  const savedXml = () => page.evaluate(() => localStorage.getItem('process-designer-unsaved-changes'));
  const before = await savedXml();
  await input.fill(value);
  await input.press('Tab');
  if (await input.getAttribute('contenteditable') === 'true') await expect(input).toHaveText(value);
  else await expect(input).toHaveValue(value);
  // Text and FEEL entries debounce writes to the model independently of the DOM.
  // Waiting for serialization prevents a later edit from racing that write.
  await expect.poll(savedXml, { message: `Persists ${id}`, intervals: [50, 100, 250] }).not.toBe(before);
}

export async function setCheckbox(input: Locator, checked: boolean): Promise<void> {
  if (await input.isChecked() !== checked) await input.click();
  await expect(input).toBeChecked({ checked });
}

export async function expectPropertyGroups(page: Page, expected: readonly string[]): Promise<void> {
  const actual = await page.locator('.bio-properties-panel [data-group-id]').evaluateAll(
    groups => groups.map(group => group.getAttribute('data-group-id')!.replace(/^group-/, '')).sort(),
  );
  expect(actual).toEqual([...expected].sort());
}

export async function addListItem(page: Page, groupId: string, fields: Record<string, string>): Promise<void> {
  const group = await openGroup(page, groupId);
  await group.getByTitle('Create new list item').click();
  for (const [id, value] of Object.entries(fields)) await fillEntry(page, id, value);
}

export async function removeLastListItem(page: Page, groupId: string): Promise<void> {
  const group = await openGroup(page, groupId);
  await expect(group.getByTitle('List contains 2 items')).toBeVisible();
  await group.locator('.bio-properties-panel-collapsible-entry-header').last().hover();
  await group.getByTitle('Delete item').last().click();
  await expect(group.getByTitle('List contains 1 item')).toBeVisible();
}

export async function propertySnapshot(page: Page) {
  for (const group of await page.locator('.bio-properties-panel [data-group-id]').all()) {
    const id = (await group.getAttribute('data-group-id'))!.replace(/^group-/, '');
    await openGroup(page, id);
  }
  return page.locator('.bio-properties-panel [data-entry-id]').evaluateAll(entries => entries.flatMap(entry => {
    const input = entry.querySelector('input:not([type="hidden"]), textarea, select, [contenteditable="true"]') as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | HTMLElement | null;
    if (!input) return [];
    return [{
      id: entry.getAttribute('data-entry-id'),
      value: input instanceof HTMLInputElement && input.type === 'checkbox' ? input.checked : 'value' in input ? input.value : input.textContent,
    }];
  }));
}
