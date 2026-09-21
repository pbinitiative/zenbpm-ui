import {expect, test, type Page} from '@playwright/test';

import {
    selectShape,
    changeElement,
    toggleMarker,
    downloadBpmnXml,
    expectPropertiesRoundTrip,
    createProcess,
    appendElement,
    renameSelectedElement,
    createFromPalette,
    connectElements,
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
    editBusinessKey,
    editMultiInstance,
} from '../../helpers/commonProperties';
import {expectXmlElements, expectValidBpmnXml} from '../../helpers/bpmnAssertions';
import {deployProcess, expectDeploymentSaved} from '../../helpers/processDeployment';

const ELEMENT_ID = 'Element_under_test';
const PROPERTY_GROUPS = [
    ...COMMON_PROPERTY_GROUPS,
    'zenbpm-ioMapping-inputs',
    'zenbpm-ioMapping-outputs',
    'zenbpm-businessKey',
];

test.describe('Sub-process — expanded', () => {
    test.beforeEach(async ({page}) => {
        await createSubprocessDiagram(page);
        await selectContainer(page, ELEMENT_ID);
    });

    test('designs the element and exports its BPMN type and variant', async ({page}) => {
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
    });

    test('shows, edits and persists properties through XML import', async ({page}) => {
        const editedId = await editSubProcessProperties(page);
        await editBusinessKey(page);
        await expectPropertyGroups(page, PROPERTY_GROUPS);
        const xml = await expectPropertiesRoundTrip(page, () => selectContainer(page, editedId));
        expectMetadataXml(xml);
        await expectDesign(page, xml, editedId);
    });

    test('deploys the designed process and reads back its BPMN XML', async ({page}) => {
        await editBusinessKey(page);
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
        const response = await deployProcess(page);
        await expectDeploymentSaved(page, response, xml);
    });

    async function expectDesign(page: Page, xml: string, id: string): Promise<void> {
        await expectSubProcessXml(page, xml, id);
        await expectXmlElements(page, xml, `[id="${id}"] > :is(multiInstanceLoopCharacteristics, standardLoopCharacteristics)`, []);
        await expectXmlElements(page, xml, `BPMNShape[bpmnElement="${id}"][isExpanded="true"]`, [{}]);
    }
});

test.describe('Sub-process — collapsed', () => {
    test.beforeEach(async ({page}) => {
        await createSubprocessDiagram(page);
        await selectContainer(page, ELEMENT_ID);
        await changeElement(page, 'Sub-process (collapsed)');
    });

    test('designs the element and exports its BPMN type and variant', async ({page}) => {
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
    });

    test('shows, edits and persists properties through XML import', async ({page}) => {
        const editedId = await editSubProcessProperties(page);
        await editBusinessKey(page);
        await expectPropertyGroups(page, PROPERTY_GROUPS);
        const xml = await expectPropertiesRoundTrip(page, () => selectContainer(page, editedId));
        expectMetadataXml(xml);
        await expectDesign(page, xml, editedId);
    });

    test('deploys the designed process and reads back its BPMN XML', async ({page}) => {
        await editBusinessKey(page);
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
        const response = await deployProcess(page);
        await expectDeploymentSaved(page, response, xml);
    });

    async function expectDesign(page: Page, xml: string, id: string): Promise<void> {
        await expectSubProcessXml(page, xml, id);
        await expectXmlElements(page, xml, `[id="${id}"] > :is(multiInstanceLoopCharacteristics, standardLoopCharacteristics)`, []);
        await expectXmlElements(page, xml, `BPMNShape[bpmnElement="${id}"][isExpanded="true"]`, []);
    }
});

test.describe('Sub-process — expanded — parallel loop', () => {
    test.beforeEach(async ({page}) => {
        await createSubprocessDiagram(page);
        await selectContainer(page, ELEMENT_ID);
        await toggleMarker(page, 'Parallel multi-instance');
    });

    test('designs the element and exports its BPMN type and variant', async ({page}) => {
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
    });

    test('shows, edits and persists properties through XML import', async ({page}) => {
        const editedId = await editSubProcessProperties(page);
        await editBusinessKey(page);
        await editMultiInstance(page);
        await expectPropertyGroups(page, [...PROPERTY_GROUPS, 'multiInstance']);
        const xml = await expectPropertiesRoundTrip(page, () => selectContainer(page, editedId));
        expectMetadataXml(xml);
        await expectDesign(page, xml, editedId);
    });

    test('deploys the designed process and reads back its BPMN XML', async ({page}) => {
        await editBusinessKey(page);
        await editMultiInstance(page);
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
        const response = await deployProcess(page);
        await expectDeploymentSaved(page, response, xml);
    });

    async function expectDesign(page: Page, xml: string, id: string): Promise<void> {
        await expectSubProcessXml(page, xml, id);
        await expectXmlElements(page, xml, `[id="${id}"] > :is(multiInstanceLoopCharacteristics, standardLoopCharacteristics)`, [{name: 'multiInstanceLoopCharacteristics'}]);
        await expectXmlElements(page, xml, `[id="${id}"] > multiInstanceLoopCharacteristics[isSequential="true"]`, []);
        await expectXmlElements(page, xml, `BPMNShape[bpmnElement="${id}"][isExpanded="true"]`, [{}]);
    }
});

test.describe('Sub-process — expanded — sequential loop', () => {
    test.beforeEach(async ({page}) => {
        await createSubprocessDiagram(page);
        await selectContainer(page, ELEMENT_ID);
        await toggleMarker(page, 'Sequential multi-instance');
    });

    test('designs the element and exports its BPMN type and variant', async ({page}) => {
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
    });

    test('shows, edits and persists properties through XML import', async ({page}) => {
        const editedId = await editSubProcessProperties(page);
        await editBusinessKey(page);
        await editMultiInstance(page);
        await expectPropertyGroups(page, [...PROPERTY_GROUPS, 'multiInstance']);
        const xml = await expectPropertiesRoundTrip(page, () => selectContainer(page, editedId));
        expectMetadataXml(xml);
        await expectDesign(page, xml, editedId);
    });

    test('deploys the designed process and reads back its BPMN XML', async ({page}) => {
        await editBusinessKey(page);
        await editMultiInstance(page);
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
        const response = await deployProcess(page);
        await expectDeploymentSaved(page, response, xml);
    });

    async function expectDesign(page: Page, xml: string, id: string): Promise<void> {
        await expectSubProcessXml(page, xml, id);
        await expectXmlElements(page, xml, `[id="${id}"] > :is(multiInstanceLoopCharacteristics, standardLoopCharacteristics)`, [{name: 'multiInstanceLoopCharacteristics'}]);
        await expectXmlElements(page, xml, `[id="${id}"] > multiInstanceLoopCharacteristics`, [{attributes: {isSequential: 'true'}}]);
        await expectXmlElements(page, xml, `BPMNShape[bpmnElement="${id}"][isExpanded="true"]`, [{}]);
    }
});

test.describe('Sub-process — expanded — standard loop', () => {
    test.beforeEach(async ({page}) => {
        await createSubprocessDiagram(page);
        await selectContainer(page, ELEMENT_ID);
        await toggleMarker(page, 'Loop');
    });

    test('designs the element and exports its BPMN type and variant', async ({page}) => {
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
    });

    test('shows, edits and persists properties through XML import', async ({page}) => {
        const editedId = await editSubProcessProperties(page);
        await editBusinessKey(page);
        await expectPropertyGroups(page, PROPERTY_GROUPS);
        const xml = await expectPropertiesRoundTrip(page, () => selectContainer(page, editedId));
        expectMetadataXml(xml);
        await expectDesign(page, xml, editedId);
    });

    test('deploys the designed process and reads back its BPMN XML', async ({page}) => {
        await editBusinessKey(page);
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
        const response = await deployProcess(page);
        await expectDeploymentSaved(page, response, xml);
    });

    async function expectDesign(page: Page, xml: string, id: string): Promise<void> {
        await expectSubProcessXml(page, xml, id);
        await expectXmlElements(page, xml, `[id="${id}"] > :is(multiInstanceLoopCharacteristics, standardLoopCharacteristics)`, [{name: 'standardLoopCharacteristics'}]);
        await expectXmlElements(page, xml, `BPMNShape[bpmnElement="${id}"][isExpanded="true"]`, [{}]);
    }
});

async function createSubprocessDiagram(page: Page): Promise<void> {
    await createProcess(page);
    const children = await createFromPalette(page, 'Create expanded sub-process', {x: 450, y: 250}, ELEMENT_ID);
    expect(children).toHaveLength(1);
    await selectShape(page, children[0]);
    await renameSelectedElement(page, 'Inner_start');
    await appendElement(page, 'Inner_start', 'Append task', 'Inner_task');
    await changeElement(page, 'User task');
    await appendElement(page, 'Inner_task', 'Append end event', 'Inner_end');
    await createFromPalette(page, 'Create end event', {x: 1000, y: 250}, 'End');
    await connectElements(page, 'Start', ELEMENT_ID, 'Flow_in', {x: 0.02, y: 0.5});
    await selectContainer(page, ELEMENT_ID);
    await connectElements(page, ELEMENT_ID, 'End', 'Flow_out');
    await selectContainer(page, ELEMENT_ID);
}

async function editSubProcessProperties(page: Page): Promise<string> {
    await openGroup(page, 'general');
    await fillEntry(page, 'name', 'sub process edited');
    const editedId = `${ELEMENT_ID}_edited`;
    await editMetadata(page, editedId);
    await editInputMappings(page, editedId);
    await editOutputMappings(page, editedId);
    await editExtensionProperties(page, editedId);
    await editExampleData(page);
    return editedId;
}

async function expectSubProcessXml(page: Page, xml: string, id: string): Promise<void> {
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
    await expectXmlElements(page, xml, '[id="Flow_in"]', [{attributes: {sourceRef: 'Start', targetRef: id}}]);
    await expectXmlElements(page, xml, '[id="Flow_out"]', [{attributes: {sourceRef: id, targetRef: 'End'}}]);
}
