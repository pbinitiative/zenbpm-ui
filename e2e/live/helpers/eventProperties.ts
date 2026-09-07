import { expect, type Page } from '@playwright/test';

import { currentProcessId } from './processDesigner';
import { entry, fillEntry, openGroup } from './propertiesPanel';

/** The caller chooses the reference field; no element-type or event-type dispatch. */
async function editReference(page: Page, referenceEntry: string, nameEntry: string): Promise<void> {
  const reference = entry(page, referenceEntry).getByRole('combobox');
  await reference.selectOption({ label: 'Create new ...' });
  const name = `${await currentProcessId(page)}-${nameEntry}`;
  await fillEntry(page, nameEntry, name);
  const id = await reference.inputValue();
  await reference.selectOption('');
  await expect(entry(page, nameEntry)).toHaveCount(0);
  await reference.selectOption(id);
  await expect(entry(page, nameEntry).getByRole('textbox')).toHaveValue(name);
}

export async function editMessageReference(page: Page): Promise<void> {
  await openGroup(page, 'message');
  await editReference(page, 'messageRef', 'messageName');
}

export async function editSignalReference(page: Page): Promise<void> {
  await openGroup(page, 'signal');
  await editReference(page, 'signalRef', 'signalName');
}

export async function editErrorReference(page: Page): Promise<void> {
  await openGroup(page, 'error');
  await editReference(page, 'errorRef', 'errorName');
  await fillEntry(page, 'errorCode', 'E2E_CODE');
}

export async function editEscalationReference(page: Page): Promise<void> {
  await openGroup(page, 'escalation');
  await editReference(page, 'escalationRef', 'escalationName');
  await fillEntry(page, 'escalationCode', 'E2E_CODE');
}

export async function editTimer(page: Page, definition: string, value: string): Promise<void> {
  await openGroup(page, 'timer');
  const timer = entry(page, 'timerEventDefinitionType').getByRole('combobox');
  await expect(timer.locator('option')).toHaveText(['<none>', 'Date', 'Duration', 'Cycle']);
  await timer.selectOption(definition);
  await fillEntry(page, 'timerEventDefinitionValue', value);
}
