import { test, type Page } from '@playwright/test';

import {
  selectShape,
  changeElement,
  downloadBpmnXml,
  expectPropertiesRoundTrip,
  createProcess,
  createFromPalette,
  connectElements,
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
import { deployProcess, expectDeploymentRejected } from '../../helpers/processDeployment';

const ELEMENT_ID = 'Element_under_test';
const PROPERTY_GROUPS = COMMON_PROPERTY_GROUPS;

test.describe('Complex gateway', () => {
  test.beforeEach(async ({ page }) => {
    await createGatewayDiagram(page);
    await selectShape(page, ELEMENT_ID);
    await changeElement(page, 'Complex gateway');
  });

  test('designs the element and exports its BPMN type and variant', async ({ page }) => {
    const xml = await downloadBpmnXml(page);
    await expectComplexGatewayXml(page, xml, ELEMENT_ID);
  });

  test('shows, edits and persists properties through XML import', async ({ page }) => {
    const editedId = await editComplexGatewayProperties(page);
    await expectPropertyGroups(page, PROPERTY_GROUPS);
    const xml = await expectPropertiesRoundTrip(page, () => selectShape(page, editedId));
    expectMetadataXml(xml);
    await expectComplexGatewayXml(page, xml, editedId);
  });

  test('rejects unsupported deployment with a specific validation error', async ({ page }) => {
    const xml = await downloadBpmnXml(page);
    await expectComplexGatewayXml(page, xml, ELEMENT_ID);
    const response = await deployProcess(page);
    await expectDeploymentRejected(page, response, 'unsupported element type \'complexGateway\'');
  });
});

async function createGatewayDiagram(page: Page): Promise<void> {
    await createProcess(page);
    await createFromPalette(page, 'Create gateway', { x: 360, y: 180 }, ELEMENT_ID);
    await connectElements(page, 'Start', ELEMENT_ID, 'Flow_in');
    await createFromPalette(page, 'Create task', { x: 550, y: 100 }, 'Branch_0');
    await changeElement(page, 'User task');
    await createFromPalette(page, 'Create task', { x: 550, y: 300 }, 'Branch_1');
    await changeElement(page, 'User task');
    await createFromPalette(page, 'Create end event', { x: 780, y: 180 }, 'End');
    await connectElements(page, ELEMENT_ID, 'Branch_0', 'Branch_in_0');
    await connectElements(page, ELEMENT_ID, 'Branch_1', 'Branch_in_1');
    await connectElements(page, 'Branch_0', 'End', 'Branch_out_0');
    await connectElements(page, 'Branch_1', 'End', 'Branch_out_1');
}

async function editComplexGatewayProperties(page: Page): Promise<string> {
    await openGroup(page, 'general');
    await fillEntry(page, 'name', 'complex gateway edited');
    const editedId = `${ELEMENT_ID}_edited`;
    await editMetadata(page, editedId);
    await editExtensionProperties(page, editedId);
    await editExampleData(page);
    return editedId;
}

async function expectComplexGatewayXml(page: Page, xml: string, id: string): Promise<void> {
    await expectValidBpmnXml(page, xml);
    await expectXmlElements(page, xml, `[id="${id}"]`, [{ name: 'complexGateway' }]);
    await expectXmlElements(page, xml, `BPMNShape[bpmnElement="${id}"]`, [{ name: 'BPMNShape' }]);
    await expectXmlElements(page, xml, '[id="Flow_in"]', [{ attributes: { sourceRef: 'Start', targetRef: id } }]);
    await expectXmlElements(page, xml, `[sourceRef="${id}"]`, [
        { name: 'sequenceFlow', attributes: { targetRef: 'Branch_0' } },
        { name: 'sequenceFlow', attributes: { targetRef: 'Branch_1' } },
    ]);
    await expectXmlElements(page, xml, '[id="Branch_out_0"], [id="Branch_out_1"]', [
        { attributes: { sourceRef: 'Branch_0', targetRef: 'End' } },
        { attributes: { sourceRef: 'Branch_1', targetRef: 'End' } },
    ]);
    await expectXmlElements(page, xml, '[id="Branch_0"], [id="Branch_1"]', [{ name: 'userTask' }, { name: 'userTask' }]);
}
