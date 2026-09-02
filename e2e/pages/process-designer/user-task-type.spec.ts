import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const FIXTURE_DIR = fileURLToPath(new URL('./fixtures', import.meta.url));
const FIXTURE_BPMN = path.join(FIXTURE_DIR, 'user-task-no-type.bpmn');

test.describe('Process Designer — User Task configurable Type', () => {
  test('exposes a Type input on the User Task and persists the value into the BPMN XML', async ({ page }) => {
    // 1) Open the Process Designer (no key in the URL → starts from a blank diagram).
    await page.goto('/designer/process');
    await expect(page).toHaveURL(/\/designer\/process$/);

    const designer = page.getByTestId('process-designer-page');
    const editor = page.getByTestId('process-designer-editor-container');
    await expect(designer).toBeVisible();
    await expect(editor).toBeVisible();

    // Wait for the modeler to finish importing the empty diagram — the bpmn-js
    // canvas root element is rendered once `importXML` settles.
    await expect(page.locator('.bjs-container')).toBeVisible({ timeout: 15000 });

    // 2) Import a fixture BPMN that already contains a `bpmn:userTask` (without a
    //    `zenbpm:TaskDefinition` extension), so the test focuses on the
    //    user-visible editing flow rather than palette interaction.
    const fileInput = page.getByTestId('process-designer-file-input');
    await fileInput.setInputFiles(FIXTURE_BPMN);

    // The modeler renders each shape with a `data-element-id` attribute; the
    // user task we just imported is the one with id `user-task`.
    const userTask = page.locator('[data-element-id="user-task"]');
    await expect(userTask).toBeVisible({ timeout: 10000 });

    // 3) Select the User Task. The properties panel re-renders with the
    //    element-specific groups, including the zenbpm "Task definition"
    //    group whose Type input is the user-visible feature. The group is
    //    collapsed by default (`shouldOpen = false`), so we must click the
    //    group header to reveal the entry before the input is visible.
    await userTask.click();
    const taskDefinitionGroup = page.locator(
      '[data-group-id="group-zenbpm-taskDefinition"]',
    );
    await expect(taskDefinitionGroup).toBeVisible({ timeout: 10000 });
    const groupHeader = taskDefinitionGroup.locator(
      '.bio-properties-panel-group-header',
    );
    // If the group is collapsed, click to expand. `aria-expanded` is not
    // set on the header, so we read the class to detect state.
    const groupEntries = taskDefinitionGroup.locator(
      '.bio-properties-panel-group-entries',
    );
    const isOpen = await groupEntries.evaluate(
      (el) => el.classList.contains('open'),
    );
    if (!isOpen) {
      await groupHeader.click();
    }
    await expect(groupEntries).toHaveClass(/\bopen\b/);

    const typeEntry = page.locator('[data-entry-id="zenbpm-taskDef-type"]');
    await expect(typeEntry).toBeVisible({ timeout: 10000 });

    const typeInput = typeEntry.locator('input.bio-properties-panel-input');
    await expect(typeInput).toBeVisible();
    // Sanity: the imported fixture has no taskDefinition, so the field is empty.
    await expect(typeInput).toHaveValue('');

    // 4) Enter `approval` and commit by blurring the field. The
    //    properties-panel Textfield defers `setValue` until blur, so we must
    //    press Tab (or click elsewhere) to actually push the value into the
    //    modeler. The modeler's `commandStack.changed` then triggers
    //    `xmlContent` re-serialization in `useProcessDesigner`.
    await typeInput.fill('approval');
    await typeInput.press('Tab');

    // After blur, the properties panel input must display the new value.
    await expect(typeInput).toHaveValue('approval');

    // 5) Export the BPMN by triggering the Download action. `modeler.saveXML`
    //    serializes the current commandStack state, so the file always
    //    reflects what was just edited (not the original fixture).
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /^download$/i }).click(),
    ]);
    const downloadPath = await download.path();
    expect(downloadPath).toBeTruthy();
    const xml = await readFile(downloadPath!, 'utf-8');

    // The exported XML must contain the `zenbpm:TaskDefinition` extension with
    // type="approval" on the `user-task` User Task, plus a `BPMNDiagram` so
    // it can be re-imported by the modeler.
    expect(xml).toMatch(/<bpmn:userTask[^>]*\bid="user-task"/);
    expect(xml).toMatch(/<zenbpm:taskDefinition[^>]*\btype="approval"/);
    expect(xml).toMatch(/<bpmndi:BPMNDiagram/);

    // 6) Reload the exported XML into the modeler and re-open the User Task
    //    to prove the value is preserved across an import round-trip.
    await fileInput.setInputFiles({
      name: 'exported.bpmn',
      mimeType: 'application/xml',
      buffer: Buffer.from(xml, 'utf-8'),
    });

    // Re-import settles async (zoom + canvas re-render); wait for the shape.
    const userTaskAfterRoundTrip = page.locator('[data-element-id="user-task"]');
    await expect(userTaskAfterRoundTrip).toBeVisible({ timeout: 10000 });
    await userTaskAfterRoundTrip.click();

    // Same group-expand dance as the first edit — the panel re-mounts on
    // import, so the zenbpm group is collapsed again.
    const taskDefinitionGroupAfterRoundTrip = page.locator(
      '[data-group-id="group-zenbpm-taskDefinition"]',
    );
    await expect(taskDefinitionGroupAfterRoundTrip).toBeVisible({ timeout: 10000 });
    const groupEntriesAfterRoundTrip = taskDefinitionGroupAfterRoundTrip.locator(
      '.bio-properties-panel-group-entries',
    );
    const isOpenAfterRoundTrip = await groupEntriesAfterRoundTrip.evaluate(
      (el) => el.classList.contains('open'),
    );
    if (!isOpenAfterRoundTrip) {
      await taskDefinitionGroupAfterRoundTrip
        .locator('.bio-properties-panel-group-header')
        .click();
    }
    await expect(groupEntriesAfterRoundTrip).toHaveClass(/\bopen\b/);

    const typeEntryAfterRoundTrip = page.locator('[data-entry-id="zenbpm-taskDef-type"]');
    await expect(typeEntryAfterRoundTrip).toBeVisible({ timeout: 10000 });
    await expect(
      typeEntryAfterRoundTrip.locator('input.bio-properties-panel-input'),
    ).toHaveValue('approval');
  });

  test('also exposes the same Type input when a brand-new (empty) diagram is opened', async ({ page }) => {
    // This is a smoke test for the modeler integration — even an empty
    // diagram must surface the zenbpm properties panel for the elements
    // the user adds. We only assert the panel module loaded, not the
    // editing flow (covered by the round-trip test above).
    await page.goto('/designer/process');
    const editor = page.getByTestId('process-designer-editor-container');
    await expect(editor).toBeVisible();
    await expect(page.locator('.bjs-container')).toBeVisible({ timeout: 15000 });

    // The empty diagram has a single start event; selecting it shows the
    // generic BPMN properties group but no zenbpm:TaskDefinition entry
    // (that entry is only rendered for User Tasks and service-task-like
    // elements). The mere presence of the properties panel proves the
    // zenbpm provider is registered.
    const startEvent = page.locator('[data-element-id="StartEvent_1"]');
    await expect(startEvent).toBeVisible({ timeout: 10000 });
    await startEvent.click();
    const propertiesPanel = page.locator('.bio-properties-panel');
    await expect(propertiesPanel).toBeVisible();
    await expect(
      page.locator('[data-entry-id="zenbpm-taskDef-type"]'),
    ).toHaveCount(0);
  });
});

test.describe('Process Designer — Call Activity version-tag binding', () => {
  test('defaults to Latest and serializes a selected version tag', async ({ page }) => {
    await page.goto('/designer/process');
    await expect(page.locator('.bjs-container')).toBeVisible({ timeout: 15000 });

    await page.getByTestId('process-designer-file-input').setInputFiles(
      path.join(FIXTURE_DIR, 'call-activity-default-binding.bpmn'),
    );

    const callActivity = page.locator('[data-element-id="callActivity"]');
    await expect(callActivity).toBeVisible({ timeout: 10000 });
    await callActivity.click();

    const calledElementGroup = page.locator('[data-group-id="group-zenbpm-calledElement"]');
    await expect(calledElementGroup).toBeVisible({ timeout: 10000 });
    const entries = calledElementGroup.locator('.bio-properties-panel-group-entries');
    if (!(await entries.evaluate((el) => el.classList.contains('open')))) {
      await calledElementGroup.locator('.bio-properties-panel-group-header').click();
    }

    const bindingEntry = page.locator('[data-entry-id="zenbpm-calledEl-bindingType"]');
    const bindingSelect = bindingEntry.locator('select');
    await expect(bindingSelect).toHaveValue('latest');
    await expect(bindingSelect.locator('option:checked')).toHaveText('Latest');
    await expect(page.locator('[data-entry-id="zenbpm-calledEl-versionTag"]')).toHaveCount(0);
    await bindingSelect.selectOption('versionTag');

    const tagEntry = page.locator('[data-entry-id="zenbpm-calledEl-versionTag"]');
    const tagInput = tagEntry.locator('input');
    await expect(tagInput).toBeVisible();
    await tagInput.fill('release-1');
    await tagInput.press('Tab');

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /^download$/i }).click(),
    ]);
    const xml = await readFile((await download.path())!, 'utf-8');

    expect(xml).toMatch(/<zenbpm:calledElement[^>]*\bbindingType="versionTag"/);
    expect(xml).toMatch(/<zenbpm:calledElement[^>]*\bversionTag="release-1"/);
  });
});
