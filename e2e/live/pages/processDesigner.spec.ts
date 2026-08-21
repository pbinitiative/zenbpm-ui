import { expect, test } from '@playwright/test';
import {
  expectAppShell,
  expectDesignerActions,
  expectVisibleTitles,
} from '../supports/appAssertions.ts';

test('process designer shows the BPMN canvas, properties and editor actions', async ({ page }) => {
  await page.goto('/designer/process');

  await expect(page).toHaveURL(/\/designer\/process$/);
  await expectAppShell(page);

  const designer = page.getByTestId('process-designer-page');
  const editor = page.getByTestId('process-designer-editor-container');
  await expect(designer).toBeVisible();
  await expect(editor).toBeVisible();

  for (const value of ['Process', 'General', 'Documentation', 'Extension properties', 'Example data']) {
    await expect(editor.getByText(value, { exact: true })).toBeVisible();
  }

  await expectVisibleTitles(page, [
    'Activate hand tool',
    'Activate lasso tool',
    'Activate create/remove space tool',
    'Activate global connect tool',
    'Create start event',
    'Create intermediate/boundary event',
    'Create end event',
    'Create gateway',
    'Create task',
    'Create expanded sub-process',
    'Create data object reference',
    'Create data store reference',
    'Create pool/participant',
    'Create group',
    'Create new list item',
  ]);

  const sectionToggles = page.getByTitle('Toggle section', { exact: true });
  await expect(sectionToggles).toHaveCount(3);
  for (const toggle of await sectionToggles.all()) {
    await expect(toggle).toBeVisible();
  }

  await expectDesignerActions(page);
});
