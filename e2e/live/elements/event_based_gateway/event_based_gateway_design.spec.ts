import {test, type Page} from '@playwright/test';

import {
    selectShape,
    changeElement,
    downloadBpmnXml,
    expectPropertiesRoundTrip,
    createProcess,
    createFromPalette,
    connectElements,
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

import {editTimer} from '../../helpers/eventProperties';

const ELEMENT_ID = 'Element_under_test';
const PROPERTY_GROUPS = COMMON_PROPERTY_GROUPS;

test.describe('Event-based gateway', () => {
    test.beforeEach(async ({page}) => {
        await createEventGatewayDiagram(page);
        await selectShape(page, ELEMENT_ID);
    });

    test('designs the element and exports its BPMN type and variant', async ({page}) => {
        const xml = await downloadBpmnXml(page);
        await expectEventBasedGatewayXml(page, xml, ELEMENT_ID);
    });

    test('shows, edits and persists properties through XML import', async ({page}) => {
        const editedId = await editEventBasedGatewayProperties(page);
        await expectPropertyGroups(page, PROPERTY_GROUPS);
        const xml = await expectPropertiesRoundTrip(page, () => selectShape(page, editedId));
        expectMetadataXml(xml);
        await expectEventBasedGatewayXml(page, xml, editedId);
    });

    test('deploys the designed process and reads back its BPMN XML', async ({page}) => {
        const xml = await downloadBpmnXml(page);
        await expectEventBasedGatewayXml(page, xml, ELEMENT_ID);
        const response = await deployProcess(page);
        await expectDeploymentSaved(page, response, xml);
    });
});

async function createEventGatewayDiagram(page: Page): Promise<void> {
    await createProcess(page);
    await createFromPalette(page, 'Create gateway', {x: 360, y: 180}, ELEMENT_ID);
    await connectElements(page, 'Start', ELEMENT_ID, 'Flow_in');
    await selectShape(page, ELEMENT_ID);
    await changeElement(page, 'Event-based gateway');
    await createFromPalette(page, 'Create intermediate/boundary event', {x: 550, y: 100}, 'Branch_0');
    await changeElement(page, 'Timer intermediate catch event');
    await editTimer(page, 'timeDuration', 'PT1H');
    await createFromPalette(page, 'Create intermediate/boundary event', {x: 550, y: 300}, 'Branch_1');
    await changeElement(page, 'Timer intermediate catch event');
    await editTimer(page, 'timeDuration', 'PT1H');
    await createFromPalette(page, 'Create end event', {x: 780, y: 180}, 'End');
    await connectElements(page, ELEMENT_ID, 'Branch_0', 'Branch_in_0');
    await connectElements(page, ELEMENT_ID, 'Branch_1', 'Branch_in_1');
    await connectElements(page, 'Branch_0', 'End', 'Branch_out_0');
    await connectElements(page, 'Branch_1', 'End', 'Branch_out_1');
}

async function editEventBasedGatewayProperties(page: Page): Promise<string> {
    await openGroup(page, 'general');
    await fillEntry(page, 'name', 'event based gateway edited');
    const editedId = `${ELEMENT_ID}_edited`;
    await editMetadata(page, editedId);
    await editExtensionProperties(page, editedId);
    await editExampleData(page);
    return editedId;
}

async function expectEventBasedGatewayXml(page: Page, xml: string, id: string): Promise<void> {
    await expectValidBpmnXml(page, xml);
    await expectXmlElements(page, xml, `[id="${id}"]`, [{name: 'eventBasedGateway'}]);
    await expectXmlElements(page, xml, `BPMNShape[bpmnElement="${id}"]`, [{name: 'BPMNShape'}]);
    await expectXmlElements(page, xml, '[id="Flow_in"]', [{attributes: {sourceRef: 'Start', targetRef: id}}]);
    await expectXmlElements(page, xml, `[sourceRef="${id}"]`, [
        {name: 'sequenceFlow', attributes: {targetRef: 'Branch_0'}},
        {name: 'sequenceFlow', attributes: {targetRef: 'Branch_1'}},
    ]);
    await expectXmlElements(page, xml, '[id="Branch_out_0"], [id="Branch_out_1"]', [
        {attributes: {sourceRef: 'Branch_0', targetRef: 'End'}},
        {attributes: {sourceRef: 'Branch_1', targetRef: 'End'}},
    ]);
    await expectXmlElements(page, xml, '[id="Branch_0"], [id="Branch_1"]', [{name: 'intermediateCatchEvent'}, {name: 'intermediateCatchEvent'}]);
}
