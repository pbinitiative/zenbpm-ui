import { expect, type Page } from '@playwright/test';

type StartInstanceOptions = {
  useRandomBusinessKey?: boolean;
  businessKey?: string;
  /** The variables of the instance, as the JSON the dialog takes. */
  variables?: string;
};

export async function startProcessInstance(
  page: Page,
  options: StartInstanceOptions = {},
): Promise<string | undefined> {
  const { useRandomBusinessKey = true, businessKey, variables } = options;

  await page.getByTestId('process-definition-start-instance-button').click();

  const dialog = page.locator('.MuiDialogContent-root:visible');
  await expect(dialog).toBeVisible();

  const input = dialog.getByRole('textbox', { name: 'Business Key' });
  await expect(input).toBeVisible();

  let finalBusinessKey: string | undefined;

  if (useRandomBusinessKey || businessKey) {
    finalBusinessKey = businessKey ?? Math.random().toString(36).substring(2, 10);

    await input.fill(finalBusinessKey);
    await expect(input).toHaveValue(finalBusinessKey);
  }

  if (variables !== undefined) {
    await dialog.locator('.monaco-editor').first().click();
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Delete');
    // inserted in one piece, so that the editor closes no bracket or quote of its own
    await page.keyboard.insertText(variables);
  }

  const btn = page.getByRole('button', { name: 'Start' });
  await btn.waitFor();
  await btn.click();

  return finalBusinessKey;
}
