import { expect, test, type Page } from '@playwright/test';

import {
  changeElement,
  selectProcess,
  currentProcessId,
  downloadBpmnXml,
  expectPropertiesRoundTrip,
  createProcess,
  appendElement,
} from '../../helpers/processDesigner';
import {
  openGroup,
  entry,
  fillEntry,
  setCheckbox,
  expectPropertyGroups,
} from '../../helpers/propertiesPanel';
import {
  COMMON_PROPERTY_GROUPS,
  editMetadata,
  editExtensionProperties,
  editExampleData,
  expectMetadataXml,
} from '../../helpers/commonProperties';
import { expectXmlElements, expectValidBpmnXml } from '../../helpers/bpmnAssertions';
import { deployProcess, expectDeploymentSaved } from '../../helpers/processDeployment';

const PROPERTY_GROUPS = COMMON_PROPERTY_GROUPS;

async function createProcessDiagram(page: Page): Promise<string> {
  const processId = await createProcess(page);
  await appendElement(page, 'Start', 'Append task', 'Host_task');
  await changeElement(page, 'User task');
  await appendElement(page, 'Host_task', 'Append end event', 'End');
  await selectProcess(page);
  return processId;
}

async function editProcessProperties(page: Page): Promise<string> {
  await openGroup(page, 'general');
  await fillEntry(page, 'name', 'process edited');
  const editedId = `${await currentProcessId(page)}_edited`;
  await editMetadata(page, editedId);
  await editExtensionProperties(page, editedId);
  await editExampleData(page);
  await openGroup(page, 'general');
  const executable = entry(page, 'isExecutable').getByRole('checkbox');
  await setCheckbox(executable, false);
  await expect(executable).not.toBeChecked();
  await setCheckbox(executable, true);
  await fillEntry(page, 'zenbpm-versionTag-value', 'release-1');
  return editedId;
}

async function expectProcessXml(page: Page, xml: string, id: string): Promise<void> {
  await expectValidBpmnXml(page, xml);
  await expectXmlElements(page, xml, `[id="${id}"]`, [{ name: 'process' }]);
  await expectXmlElements(page, xml, `BPMNPlane[bpmnElement="${id}"]`, [{ name: 'BPMNPlane' }]);
}

test.describe('Process', () => {
  test.beforeEach(async ({ page }) => {
    await createProcessDiagram(page);
    await selectProcess(page);
  });

  test('designs the element and exports its BPMN type and variant', async ({ page }) => {
    const xml = await downloadBpmnXml(page);
    await expectProcessXml(page, xml, await currentProcessId(page));
  });

  test('shows, edits and persists properties through XML import', async ({ page }) => {
    const editedId = await editProcessProperties(page);
    await expectPropertyGroups(page, PROPERTY_GROUPS);
    const xml = await expectPropertiesRoundTrip(page, () => selectProcess(page));
    expectMetadataXml(xml);
    await expectProcessXml(page, xml, editedId);
  });

  test('deploys the designed process and reads back its BPMN XML', async ({ page }) => {
    const xml = await downloadBpmnXml(page);
    await expectProcessXml(page, xml, await currentProcessId(page));
    const response = await deployProcess(page);
    await expectDeploymentSaved(page, response, xml);
  });
});

test('rejects empty, invalid and duplicate IDs without changing the process identity', async ({ page }) => {
  const processId = await createProcessDiagram(page);
  await selectProcess(page);
  const general = await openGroup(page, 'general');
  const id = entry(page, 'id').getByRole('textbox');
  for (const invalidId of ['', 'invalid id', '1invalid', 'Start']) {
    await id.fill(invalidId);
    await id.press('Tab');
    await expect(general.locator('.bio-properties-panel-error')).toBeVisible();
    expect(await downloadBpmnXml(page)).toContain(`<bpmn:process id="${processId}"`);
  }
  await fillEntry(page, 'id', `${processId}_valid`);
  await expect(general.locator('.bio-properties-panel-error')).toHaveCount(0);
});
