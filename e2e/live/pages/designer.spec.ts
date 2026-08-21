import { expect, test } from '@playwright/test';
import { expectAppShell } from '../supports/appAssertions.ts';

test('designer landing page shows both design options and their previews', async ({ page }) => {
  await page.goto('/designer');

  await expect(page).toHaveURL(/\/designer$/);
  await expectAppShell(page);
  await expect(
    page.getByRole('heading', { name: 'What would you like to design?', exact: true }),
  ).toBeVisible();

  const processCard = page.getByRole('button', { name: /Design a Process/ });
  await expect(processCard).toBeEnabled();
  await expect(processCard).toContainText('Design a Process');
  await expect(processCard).toContainText('Task');
  await expect(processCard).toContainText('X');
  await expect(processCard).toContainText(
    'Create BPMN 2.0 workflow diagrams with tasks, gateways, and events. ' +
      'Model your business processes visually and deploy them to the engine.',
  );

  const decisionCard = page.getByRole('button', { name: /Design a Decision/ });
  await expect(decisionCard).toBeEnabled();
  for (const value of ['Design a Decision', 'Input', 'Output', '> 1000', 'VIP', '10%', '> 500', 'Regular', '5%', '0%']) {
    await expect(decisionCard).toContainText(value);
  }
  await expect(decisionCard).toContainText(
    'Build DMN decision tables to define business rules. ' +
      'Create input/output mappings and automate complex decision logic.',
  );
});
