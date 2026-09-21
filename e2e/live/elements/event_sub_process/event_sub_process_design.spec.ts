import {expect, test, type Page} from '@playwright/test';

import {
    selectShape,
    changeElement,
    downloadBpmnXml,
    expectPropertiesRoundTrip,
    createProcess,
    appendElement,
    renameSelectedElement,
    createFromPalette,
    selectContainer,
} from '../../helpers/processDesigner';
import {openGroup, fillEntry, expectPropertyGroups} from '../../helpers/propertiesPanel';
import {
    COMMON_PROPERTY_GROUPS,
    editMetadata,
    editInputMappings,
    editOutputMappings,
    editExtensionProperties,
    editExampleData,
    expectMetadataXml,
} from '../../helpers/commonProperties';
import {editMessageReference} from '../../helpers/eventProperties';
import {expectXmlElements, expectValidBpmnXml} from '../../helpers/bpmnAssertions';
import {deployProcess, expectDeploymentSaved} from '../../helpers/processDeployment';

const ELEMENT_ID = 'Element_under_test';
const PROPERTY_GROUPS = [
    ...COMMON_PROPERTY_GROUPS,
    'zenbpm-ioMapping-inputs',
    'zenbpm-ioMapping-outputs',
];

test.describe('Event sub-process', () => {
    test.beforeEach(async ({page}) => {
        await createEventSubprocessDiagram(page);
        await selectContainer(page, ELEMENT_ID);
        await changeElement(page, 'Event sub-process');
        await selectShape(page, 'Inner_start');
        await changeElement(page, 'Message start event');
        await editMessageReference(page);
        await fillEntry(page, 'zenbpm-messageSubscriptionCorrelationKey', 'orderId');
        await selectContainer(page, ELEMENT_ID);
    });

    test('designs the element and exports its BPMN type and variant', async ({page}) => {
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
    });

    test('shows, edits and persists properties through XML import', async ({page}) => {
        const editedId = await editEventSubProcessProperties(page);
        await expectPropertyGroups(page, PROPERTY_GROUPS);
        const xml = await expectPropertiesRoundTrip(page, () => selectContainer(page, editedId));
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
        await expectEventSubProcessXml(page, xml, id);
        await expectXmlElements(page, xml, `[id="${id}"] > :is(multiInstanceLoopCharacteristics, standardLoopCharacteristics)`, []);
    }
});

async function createEventSubprocessDiagram(page: Page): Promise<void> {
    await createProcess(page);
    await appendElement(page, 'Start', 'Append end event', 'End');
    const children = await createFromPalette(page, 'Create expanded sub-process', {x: 450, y: 450}, ELEMENT_ID);
    expect(children).toHaveLength(1);
    await selectShape(page, children[0]);
    await renameSelectedElement(page, 'Inner_start');
    await appendElement(page, 'Inner_start', 'Append task', 'Inner_task');
    await changeElement(page, 'User task');
    await appendElement(page, 'Inner_task', 'Append end event', 'Inner_end');
    await selectContainer(page, ELEMENT_ID);
}

async function editEventSubProcessProperties(page: Page): Promise<string> {
    await openGroup(page, 'general');
    await fillEntry(page, 'name', 'event sub process edited');
    const editedId = `${ELEMENT_ID}_edited`;
    await editMetadata(page, editedId);
    await editInputMappings(page, editedId);
    await editOutputMappings(page, editedId);
    await editExtensionProperties(page, editedId);
    await editExampleData(page);
    return editedId;
}

async function expectEventSubProcessXml(page: Page, xml: string, id: string): Promise<void> {
    await expectValidBpmnXml(page, xml);
    await expectXmlElements(page, xml, `[id="${id}"]`, [{name: 'subProcess'}]);
    await expectXmlElements(page, xml, `BPMNShape[bpmnElement="${id}"]`, [{name: 'BPMNShape'}]);
    await expectXmlElements(page, xml, `[id="${id}"] > startEvent`, [{attributes: {id: 'Inner_start'}}]);
    await expectXmlElements(page, xml, `[id="${id}"] > userTask`, [{attributes: {id: 'Inner_task'}}]);
    await expectXmlElements(page, xml, `[id="${id}"] > endEvent`, [{attributes: {id: 'Inner_end'}}]);
    await expectXmlElements(page, xml, `[id="${id}"] > sequenceFlow`, [
        {attributes: {sourceRef: 'Inner_start', targetRef: 'Inner_task'}},
        {attributes: {sourceRef: 'Inner_task', targetRef: 'Inner_end'}},
    ]);
    await expectXmlElements(page, xml, `[id="${id}"]`, [{attributes: {triggeredByEvent: 'true'}}]);
    await expectXmlElements(page, xml, `[sourceRef="${id}"], [targetRef="${id}"]`, []);
}
