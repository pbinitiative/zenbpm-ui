import {expect, test, type Page} from '@playwright/test';

import {
    selectConnection,
    changeElement,
    downloadBpmnXml,
    expectPropertiesRoundTrip,
    createProcess,
    appendElement,
    renameSelectedElement,
} from '../../helpers/processDesigner';
import {openGroup, fillEntry, expectPropertyGroups} from '../../helpers/propertiesPanel';
import {
    COMMON_PROPERTY_GROUPS,
    editMetadata,
    editExtensionProperties,
    editExampleData,
    expectMetadataXml,
} from '../../helpers/commonProperties';
import {expectXmlElements, expectValidBpmnXml} from '../../helpers/bpmnAssertions';
import {deployProcess, expectDeploymentSaved} from '../../helpers/processDeployment';

const ELEMENT_ID = 'Element_under_test';
const PROPERTY_GROUPS = [
    ...COMMON_PROPERTY_GROUPS,
    'zenbpm-condition',
];

test.describe('Sequence flow', () => {
    test.beforeEach(async ({page}) => {
        await createSequenceFlowDiagram(page);
        await selectConnection(page, ELEMENT_ID);
    });

    test('designs the element and exports its BPMN type and variant', async ({page}) => {
        const xml = await downloadBpmnXml(page);
        await expectSequenceFlowXml(page, xml, ELEMENT_ID);
    });

    test('shows, edits and persists properties through XML import', async ({page}) => {
        const editedId = await editSequenceFlowProperties(page);
        await expectPropertyGroups(page, PROPERTY_GROUPS);
        const xml = await expectPropertiesRoundTrip(page, () => selectConnection(page, editedId));
        expectMetadataXml(xml);
        await expectSequenceFlowXml(page, xml, editedId);
    });

    test('deploys the designed process and reads back its BPMN XML', async ({page}) => {
        const xml = await downloadBpmnXml(page);
        await expectSequenceFlowXml(page, xml, ELEMENT_ID);
        const response = await deployProcess(page);
        await expectDeploymentSaved(page, response, xml);
    });
});

test.describe('Conditional flow', () => {
    test.beforeEach(async ({page}) => {
        await createSequenceFlowDiagram(page);
        await selectConnection(page, ELEMENT_ID);
        await changeElement(page, 'Conditional flow');
    });

    test('designs the element and exports its BPMN type and variant', async ({page}) => {
        const xml = await downloadBpmnXml(page);
        await expectSequenceFlowXml(page, xml, ELEMENT_ID);
    });

    test('shows, edits and persists properties through XML import', async ({page}) => {
        const editedId = await editSequenceFlowProperties(page);
        await openGroup(page, 'zenbpm-condition');
        await fillEntry(page, 'zenbpm-conditionExpression', 'approved = true');
        await expectPropertyGroups(page, PROPERTY_GROUPS);
        const xml = await expectPropertiesRoundTrip(page, () => selectConnection(page, editedId));
        expectMetadataXml(xml);
        await expectSequenceFlowXml(page, xml, editedId);
    });

    test('deploys the designed process and reads back its BPMN XML', async ({page}) => {
        await openGroup(page, 'zenbpm-condition');
        await fillEntry(page, 'zenbpm-conditionExpression', 'approved = true');
        const xml = await downloadBpmnXml(page);
        await expectSequenceFlowXml(page, xml, ELEMENT_ID);
        const response = await deployProcess(page);
        await expectDeploymentSaved(page, response, xml);
    });
});

test.describe('Default flow', () => {
    test.beforeEach(async ({page}) => {
        await createSequenceFlowDiagram(page);
        await selectConnection(page, ELEMENT_ID);
        await changeElement(page, 'Default flow');
    });

    test('designs the element and exports its BPMN type and variant', async ({page}) => {
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
    });

    test('shows, edits and persists properties through XML import', async ({page}) => {
        const editedId = await editSequenceFlowProperties(page);
        await expectPropertyGroups(page, PROPERTY_GROUPS);
        const xml = await expectPropertiesRoundTrip(page, () => selectConnection(page, editedId));
        expectMetadataXml(xml);
        await expectDesign(page, xml, editedId);
    });

    test('deploys the designed process and reads back its BPMN XML', async ({page}) => {
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
        const response = await deployProcess(page);
        await expectDeploymentSaved(page, response, xml);
    });

    async function expectDesign(page: Page, xml: string, id: string): Promise<void> {
        await expectSequenceFlowXml(page, xml, id);
        await expectXmlElements(page, xml, '[id="Host_task"]', [{attributes: {default: id}}]);
    }
});

async function createSequenceFlowDiagram(page: Page): Promise<void> {
    await createProcess(page);
    await appendElement(page, 'Start', 'Append task', 'Host_task');
    await changeElement(page, 'User task');
    const connections = await appendElement(page, 'Host_task', 'Append end event', 'End');
    expect(connections).toHaveLength(1);
    await selectConnection(page, connections[0]);
    await renameSelectedElement(page, ELEMENT_ID);
}

async function editSequenceFlowProperties(page: Page): Promise<string> {
    await openGroup(page, 'general');
    await fillEntry(page, 'name', 'sequence flow edited');
    const editedId = `${ELEMENT_ID}_edited`;
    await editMetadata(page, editedId);
    await editExtensionProperties(page, editedId);
    await editExampleData(page);
    return editedId;
}

async function expectSequenceFlowXml(page: Page, xml: string, id: string): Promise<void> {
    await expectValidBpmnXml(page, xml);
    await expectXmlElements(page, xml, `[id="${id}"]`, [{name: 'sequenceFlow'}]);
    await expectXmlElements(page, xml, `BPMNEdge[bpmnElement="${id}"]`, [{name: 'BPMNEdge'}]);
    await expectXmlElements(page, xml, `[id="${id}"]`, [{attributes: {sourceRef: 'Host_task', targetRef: 'End'}}]);
}
