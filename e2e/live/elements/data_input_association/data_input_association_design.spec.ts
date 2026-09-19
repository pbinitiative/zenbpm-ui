import { test, type Page } from '@playwright/test';

import {
  changeElement,
  selectConnection,
  downloadBpmnXml,
  expectPropertiesRoundTrip,
  createProcess,
  appendElement,
  createFromPalette,
  connectElements,
} from '../../helpers/processDesigner';
import { openGroup, expectPropertyGroups } from '../../helpers/propertiesPanel';
import {
  COMMON_PROPERTY_GROUPS,
  editMetadata,
  editExtensionProperties,
  editExampleData,
  expectMetadataXml,
} from '../../helpers/commonProperties';
import { expectXmlElements, expectValidBpmnXml } from '../../helpers/bpmnAssertions';
import { deployProcess, expectDeploymentSaved } from '../../helpers/processDeployment';

const ELEMENT_ID = 'Element_under_test';
const PROPERTY_GROUPS = COMMON_PROPERTY_GROUPS;

async function createDataInputAssociationDiagram(page: Page): Promise<void> {
  await createProcess(page);
  await appendElement(page, 'Start', 'Append task', 'Host_task');
  await changeElement(page, 'User task');
  await appendElement(page, 'Host_task', 'Append end event', 'End');
  await createFromPalette(page, 'Create data object reference', { x: 430, y: 370 }, 'Data');
  await connectElements(page, 'Data', 'Host_task', ELEMENT_ID);
}

async function editDataInputAssociationProperties(page: Page): Promise<string> {
  await openGroup(page, 'general');
  const editedId = `${ELEMENT_ID}_edited`;
  await editMetadata(page, editedId);
  await editExtensionProperties(page, editedId);
  await editExampleData(page);
  return editedId;
}

async function expectDataInputAssociationXml(page: Page, xml: string, id: string): Promise<void> {
  await expectValidBpmnXml(page, xml);
  await expectXmlElements(page, xml, `[id="${id}"]`, [{ name: 'dataInputAssociation' }]);
  await expectXmlElements(page, xml, `BPMNEdge[bpmnElement="${id}"]`, [{ name: 'BPMNEdge' }]);
  await expectXmlElements(page, xml, '[id="Host_task"] > dataInputAssociation', [{ attributes: { id } }]);
}

test.describe('Data input association', () => {
  test.beforeEach(async ({ page }) => {
    await createDataInputAssociationDiagram(page);
    await selectConnection(page, ELEMENT_ID);
  });

  test('designs the element and exports its BPMN type and variant', async ({ page }) => {
    const xml = await downloadBpmnXml(page);
    await expectDataInputAssociationXml(page, xml, ELEMENT_ID);
  });

  test('shows, edits and persists properties through XML import', async ({ page }) => {
    const editedId = await editDataInputAssociationProperties(page);
    await expectPropertyGroups(page, PROPERTY_GROUPS);
    const xml = await expectPropertiesRoundTrip(page, () => selectConnection(page, editedId));
    expectMetadataXml(xml);
    await expectDataInputAssociationXml(page, xml, editedId);
  });

  test('deploys the designed process and reads back its BPMN XML', async ({ page }) => {
    const xml = await downloadBpmnXml(page);
    await expectDataInputAssociationXml(page, xml, ELEMENT_ID);
    const response = await deployProcess(page);
    await expectDeploymentSaved(page, response, xml);
  });
});
