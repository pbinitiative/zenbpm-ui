import { expect, type Page } from '@playwright/test';

export async function bmpSetSelection(
  page: Page,
  label: string,
  desiredOption: string,
): Promise<void> {
  const dropdown = page
    .getByRole('dialog')
    .locator('.fjs-form-field', { hasText: label });

  await dropdown.click();

  const anchorOption = dropdown
    .locator('.fjs-select-anchor')
    .getByText(desiredOption, { exact: true });

  await expect(anchorOption).toBeVisible();
  await anchorOption.click();
}

export async function bmpSetInputValue(page: Page, label: string, value: string): Promise<void> {
  const inputField = page
    .getByRole('dialog')
    .locator('.fjs-form-field', { hasText: label })
    .getByRole('textbox');

  await inputField.fill(value);
}

export async function bmpClickButton(page: Page, buttonName: string): Promise<void> {
  const btn = page.getByRole('dialog').getByRole('button', { name: buttonName });
  await btn.waitFor();
  await btn.click();
}

export async function bmpCheckCheckbox(page: Page, label: string): Promise<void> {
  const checkbox = page
    .getByRole('dialog')
    .locator('.fjs-form-field', { hasText: label })
    .getByRole('checkbox');

  await checkbox.check();
}
