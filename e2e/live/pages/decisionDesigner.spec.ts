import { expect, test } from '@playwright/test';
import {
  expectAppShell,
  expectDesignerActions,
  expectVisibleTitles,
} from '../supports/appAssertions.ts';

test('decision designer shows the DRD canvas, properties and editor actions', async ({ page }) => {
  await page.goto('/designer/decision');

  await expect(page).toHaveURL(/\/designer\/decision$/);
  await expectAppShell(page);

  const designer = page.getByTestId('decision-designer-page');
  const editor = page.getByTestId('decision-designer-editor-container');
  await expect(designer).toBeVisible();
  await expect(editor).toBeVisible();
  await expect(editor.getByText('Decision 1', { exact: true })).toBeVisible();
  await expect(editor.getByText('Definitions', { exact: true })).toBeVisible();
  await expect(editor.getByText('General', { exact: true })).toBeVisible();
  await expect(editor.getByText('Documentation', { exact: true })).toBeVisible();

  await expect(page.getByTitle('Definition name', { exact: true })).toHaveText('DRD');
  await expect(page.getByTitle('Definition ID', { exact: true })).toHaveText(
    /^Definitions_Decision_[0-9a-f]{8}$/,
  );
  await expect(page.getByTitle('Open decision table', { exact: true })).toBeEnabled();

  await expectVisibleTitles(page, [
    'Activate hand tool',
    'Activate lasso tool',
    'Create decision',
    'Create input data',
    'Create knowledge source',
    'Create knowledge model',
  ]);

  const sectionToggles = page.getByTitle('Toggle section', { exact: true });
  await expect(sectionToggles).toHaveCount(2);
  for (const toggle of await sectionToggles.all()) {
    await expect(toggle).toBeVisible();
  }

  await expectDesignerActions(page);
});
