import { expect, type Page } from '@playwright/test';

import { addListItem, entry, fillEntry, openGroup, removeLastListItem, setCheckbox } from './propertiesPanel';

export const COMMON_PROPERTY_GROUPS = [
  'general', 'documentation', 'zenbpm-extensionProperties', 'zenbpm-exampleData',
] as const;

export async function editMetadata(page: Page, editedId: string): Promise<void> {
  await openGroup(page, 'general');
  await fillEntry(page, 'id', editedId);
  await openGroup(page, 'documentation');
  await fillEntry(page, 'documentation', 'E2E documentation: accents čřž, <xml> & "quotes".');
}

export async function editInputMappings(page: Page, elementId: string): Promise<void> {
  for (let index = 0; index < 2; index++) {
    await addListItem(page, 'zenbpm-ioMapping-inputs', {
      [`${elementId}-zenbpm-input-${index}-source`]: `value${index}`,
      [`${elementId}-zenbpm-input-${index}-target`]: `mapped${index}`,
    });
  }
  await removeLastListItem(page, 'zenbpm-ioMapping-inputs');
}

export async function editOutputMappings(page: Page, elementId: string): Promise<void> {
  for (let index = 0; index < 2; index++) {
    await addListItem(page, 'zenbpm-ioMapping-outputs', {
      [`${elementId}-zenbpm-output-${index}-source`]: `value${index}`,
      [`${elementId}-zenbpm-output-${index}-target`]: `mapped${index}`,
    });
  }
  await removeLastListItem(page, 'zenbpm-ioMapping-outputs');
}

export async function editExtensionProperties(page: Page, elementId: string): Promise<void> {
  for (let index = 0; index < 2; index++) {
    await addListItem(page, 'zenbpm-extensionProperties', {
      [`${elementId}-zenbpm-extensionProperty-${index}-name`]: `property-${index}`,
      [`${elementId}-zenbpm-extensionProperty-${index}-value`]: `value-${index}`,
    });
  }
  await removeLastListItem(page, 'zenbpm-extensionProperties');
}

export async function editExampleData(page: Page): Promise<void> {
  const group = await openGroup(page, 'zenbpm-exampleData');
  const input = entry(page, 'zenbpm-exampleData-exampleOutputJson').getByRole('textbox');
  // Invalid input is deliberately not expected to persist to the model.
  await input.fill('{"result":');
  await input.press('Tab');
  await expect(group.locator('.bio-properties-panel-error')).toContainText('Value must be valid JSON');
  await input.fill('');
  await input.press('Tab');
  await expect(group.locator('.bio-properties-panel-error')).toHaveCount(0);
  await fillEntry(page, 'zenbpm-exampleData-exampleOutputJson', '{"result":"ok"}');
}

export function expectMetadataXml(xml: string): void {
  expect(xml).toContain('E2E documentation: accents čřž, &lt;xml&gt; &amp;');
  expect(xml).toContain('name="property-0" value="value-0"');
  expect(xml).not.toContain('name="property-1"');
  expect(xml).toContain('zenbpmModeler:exampleOutputJson');
}

export async function editBusinessKey(page: Page): Promise<void> {
  await openGroup(page, 'zenbpm-businessKey');
  const override = entry(page, 'zenbpm-businessKey-override').getByRole('checkbox');
  await setCheckbox(override, true);
  await fillEntry(page, 'zenbpm-businessKey-expression', 'orderId');
  await setCheckbox(override, false);
  await expect(entry(page, 'zenbpm-businessKey-expression').getByRole('textbox')).toHaveCount(0);
  await setCheckbox(override, true);
  await fillEntry(page, 'zenbpm-businessKey-expression', 'orderId');
}

export async function editMultiInstance(page: Page): Promise<void> {
  await openGroup(page, 'multiInstance');
  await fillEntry(page, 'zenbpm-multiInstance-inputCollection', 'items');
  await fillEntry(page, 'zenbpm-multiInstance-inputElement', 'item');
  await fillEntry(page, 'zenbpm-multiInstance-outputCollection', 'results');
  await fillEntry(page, 'zenbpm-multiInstance-outputElement', 'item');
  await fillEntry(page, 'zenbpm-multiInstance-completionCondition', 'numberOfCompletedInstances >= 1');
}
