import { test, type Page } from '@playwright/test';

import {
  changeElement,
  selectShape,
  downloadBpmnXml,
  expectPropertiesRoundTrip,
  createProcess,
  appendElement,
} from '../../helpers/processDesigner';
import { openGroup, fillEntry, expectPropertyGroups } from '../../helpers/propertiesPanel';
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

test.describe('Text annotation', () => {
  test.beforeEach(async ({ page }) => {
    await createTextAnnotationDiagram(page);
    await selectShape(page, ELEMENT_ID);
  });

  test('designs the element and exports its BPMN type and variant', async ({ page }) => {
    const xml = await downloadBpmnXml(page);
    await expectTextAnnotationXml(page, xml, ELEMENT_ID);
  });

  test('shows, edits and persists properties through XML import', async ({ page }) => {
    const editedId = await editTextAnnotationProperties(page);
    await expectPropertyGroups(page, PROPERTY_GROUPS);
    const xml = await expectPropertiesRoundTrip(page, () => selectShape(page, editedId));
    expectMetadataXml(xml);
    await expectTextAnnotationXml(page, xml, editedId);
  });

  test('deploys the designed process and reads back its BPMN XML', async ({ page }) => {
    const xml = await downloadBpmnXml(page);
    await expectTextAnnotationXml(page, xml, ELEMENT_ID);
    const response = await deployProcess(page);
    await expectDeploymentSaved(page, response, xml);
  });
});

async function createTextAnnotationDiagram(page: Page): Promise<void> {
    await createProcess(page);
    await appendElement(page, 'Start', 'Append task', 'Host_task');
    await changeElement(page, 'User task');
    await appendElement(page, 'Host_task', 'Append end event', 'End');
    await appendElement(page, 'Host_task', 'Add text annotation', ELEMENT_ID);
}

async function editTextAnnotationProperties(page: Page): Promise<string> {
    await openGroup(page, 'general');
    await fillEntry(page, 'name', 'text annotation edited');
    const editedId = `${ELEMENT_ID}_edited`;
    await editMetadata(page, editedId);
    await editExtensionProperties(page, editedId);
    await editExampleData(page);
    return editedId;
}

async function expectTextAnnotationXml(page: Page, xml: string, id: string): Promise<void> {
    await expectValidBpmnXml(page, xml);
    await expectXmlElements(page, xml, `[id="${id}"]`, [{ name: 'textAnnotation' }]);
    await expectXmlElements(page, xml, `BPMNShape[bpmnElement="${id}"]`, [{ name: 'BPMNShape' }]);
}
