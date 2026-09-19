import {expect, test, type Page} from '@playwright/test';

import {
    changeElement,
    toggleMarker,
    downloadBpmnXml,
    expectPropertiesRoundTrip,
    createProcess,
    createFromPalette,
    connectElements,
    deleteShape,
    selectContainer,
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
    editMultiInstance,
} from '../../helpers/commonProperties';
import {expectXmlElements, expectValidBpmnXml} from '../../helpers/bpmnAssertions';
import {deployProcess, expectDeploymentRejected} from '../../helpers/processDeployment';

const ELEMENT_ID = 'Element_under_test';
const PROPERTY_GROUPS = [
    ...COMMON_PROPERTY_GROUPS,
    'adHocCompletion',
];

test.describe('Ad-hoc sub-process', () => {
    test.beforeEach(async ({page}) => {
        await createAdHocDiagram(page);
        await selectContainer(page, ELEMENT_ID);
        await changeElement(page, 'Ad-hoc sub-process');
    });

    test('designs the element and exports its BPMN type and variant', async ({page}) => {
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
    });

    test('shows, edits and persists properties through XML import', async ({page}) => {
        const editedId = await editAdHocSubProcessProperties(page);
        await configureAdHocCompletion(page);
        await expectPropertyGroups(page, PROPERTY_GROUPS);
        const xml = await expectPropertiesRoundTrip(page, () => selectContainer(page, editedId));
        expectMetadataXml(xml);
        await expectDesign(page, xml, editedId);
    });

    test('rejects unsupported deployment with a specific validation error', async ({page}) => {
        await configureAdHocCompletion(page);
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
        const response = await deployProcess(page);
        await expectDeploymentRejected(page, response, 'unsupported element type \'adHocSubProcess\'');
    });

    async function expectDesign(page: Page, xml: string, id: string): Promise<void> {
        await expectAdHocSubProcessXml(page, xml, id);
        await expectXmlElements(page, xml, `[id="${id}"] > :is(multiInstanceLoopCharacteristics, standardLoopCharacteristics)`, []);
    }
});

test.describe('Ad-hoc sub-process — parallel loop', () => {
    test.beforeEach(async ({page}) => {
        await createAdHocDiagram(page);
        await selectContainer(page, ELEMENT_ID);
        await changeElement(page, 'Ad-hoc sub-process');
        await toggleMarker(page, 'Parallel multi-instance');
    });

    test('designs the element and exports its BPMN type and variant', async ({page}) => {
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
    });

    test('shows, edits and persists properties through XML import', async ({page}) => {
        const editedId = await editAdHocSubProcessProperties(page);
        await editMultiInstance(page);
        await configureAdHocCompletion(page);
        await expectPropertyGroups(page, [...PROPERTY_GROUPS, 'multiInstance']);
        const xml = await expectPropertiesRoundTrip(page, () => selectContainer(page, editedId));
        expectMetadataXml(xml);
        await expectDesign(page, xml, editedId);
    });

    test('rejects unsupported deployment with a specific validation error', async ({page}) => {
        await editMultiInstance(page);
        await configureAdHocCompletion(page);
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
        const response = await deployProcess(page);
        await expectDeploymentRejected(page, response, 'unsupported element type \'adHocSubProcess\'');
    });

    async function expectDesign(page: Page, xml: string, id: string): Promise<void> {
        await expectAdHocSubProcessXml(page, xml, id);
        await expectXmlElements(page, xml, `[id="${id}"] > :is(multiInstanceLoopCharacteristics, standardLoopCharacteristics)`, [{name: 'multiInstanceLoopCharacteristics'}]);
        await expectXmlElements(page, xml, `[id="${id}"] > multiInstanceLoopCharacteristics[isSequential="true"]`, []);
    }
});

test.describe('Ad-hoc sub-process — sequential loop', () => {
    test.beforeEach(async ({page}) => {
        await createAdHocDiagram(page);
        await selectContainer(page, ELEMENT_ID);
        await changeElement(page, 'Ad-hoc sub-process');
        await toggleMarker(page, 'Sequential multi-instance');
    });

    test('designs the element and exports its BPMN type and variant', async ({page}) => {
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
    });

    test('shows, edits and persists properties through XML import', async ({page}) => {
        const editedId = await editAdHocSubProcessProperties(page);
        await editMultiInstance(page);
        await configureAdHocCompletion(page);
        await expectPropertyGroups(page, [...PROPERTY_GROUPS, 'multiInstance']);
        const xml = await expectPropertiesRoundTrip(page, () => selectContainer(page, editedId));
        expectMetadataXml(xml);
        await expectDesign(page, xml, editedId);
    });

    test('rejects unsupported deployment with a specific validation error', async ({page}) => {
        await editMultiInstance(page);
        await configureAdHocCompletion(page);
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
        const response = await deployProcess(page);
        await expectDeploymentRejected(page, response, 'unsupported element type \'adHocSubProcess\'');
    });

    async function expectDesign(page: Page, xml: string, id: string): Promise<void> {
        await expectAdHocSubProcessXml(page, xml, id);
        await expectXmlElements(page, xml, `[id="${id}"] > :is(multiInstanceLoopCharacteristics, standardLoopCharacteristics)`, [{name: 'multiInstanceLoopCharacteristics'}]);
        await expectXmlElements(page, xml, `[id="${id}"] > multiInstanceLoopCharacteristics`, [{attributes: {isSequential: 'true'}}]);
    }
});

test.describe('Ad-hoc sub-process — standard loop', () => {
    test.beforeEach(async ({page}) => {
        await createAdHocDiagram(page);
        await selectContainer(page, ELEMENT_ID);
        await changeElement(page, 'Ad-hoc sub-process');
        await toggleMarker(page, 'Loop');
    });

    test('designs the element and exports its BPMN type and variant', async ({page}) => {
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
    });

    test('shows, edits and persists properties through XML import', async ({page}) => {
        const editedId = await editAdHocSubProcessProperties(page);
        await configureAdHocCompletion(page);
        await expectPropertyGroups(page, PROPERTY_GROUPS);
        const xml = await expectPropertiesRoundTrip(page, () => selectContainer(page, editedId));
        expectMetadataXml(xml);
        await expectDesign(page, xml, editedId);
    });

    test('rejects unsupported deployment with a specific validation error', async ({page}) => {
        await configureAdHocCompletion(page);
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
        const response = await deployProcess(page);
        await expectDeploymentRejected(page, response, 'unsupported element type \'adHocSubProcess\'');
    });

    async function expectDesign(page: Page, xml: string, id: string): Promise<void> {
        await expectAdHocSubProcessXml(page, xml, id);
        await expectXmlElements(page, xml, `[id="${id}"] > :is(multiInstanceLoopCharacteristics, standardLoopCharacteristics)`, [{name: 'standardLoopCharacteristics'}]);
    }
});

test.describe('Ad-hoc sub-process (collapsed)', () => {
    test.beforeEach(async ({page}) => {
        await createAdHocDiagram(page);
        await selectContainer(page, ELEMENT_ID);
        await changeElement(page, 'Ad-hoc sub-process');
        await changeElement(page, 'Ad-hoc sub-process (collapsed)');
    });

    test('designs the element and exports its BPMN type and variant', async ({page}) => {
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
    });

    test('shows, edits and persists properties through XML import', async ({page}) => {
        const editedId = await editAdHocSubProcessProperties(page);
        await configureAdHocCompletion(page);
        await expectPropertyGroups(page, PROPERTY_GROUPS);
        const xml = await expectPropertiesRoundTrip(page, () => selectContainer(page, editedId));
        expectMetadataXml(xml);
        await expectDesign(page, xml, editedId);
    });

    test('rejects unsupported deployment with a specific validation error', async ({page}) => {
        await configureAdHocCompletion(page);
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
        const response = await deployProcess(page);
        await expectDeploymentRejected(page, response, 'unsupported element type \'adHocSubProcess\'');
    });

    async function expectDesign(page: Page, xml: string, id: string): Promise<void> {
        await expectAdHocSubProcessXml(page, xml, id);
        await expectXmlElements(page, xml, `[id="${id}"] > :is(multiInstanceLoopCharacteristics, standardLoopCharacteristics)`, []);
        await expectXmlElements(page, xml, `BPMNShape[bpmnElement="${id}"][isExpanded="true"]`, []);
    }
});


async function createAdHocDiagram(page: Page): Promise<void> {
    await createProcess(page);
    const children = await createFromPalette(page, 'Create expanded sub-process', {x: 450, y: 250}, ELEMENT_ID);
    expect(children).toHaveLength(1);
    await deleteShape(page, children[0]);
    await createFromPalette(page, 'Create task', {x: 450, y: 250}, 'Inner_task');
    await changeElement(page, 'User task');
    await createFromPalette(page, 'Create end event', {x: 1000, y: 250}, 'End');
    await connectElements(page, 'Start', ELEMENT_ID, 'Flow_in', {x: 0.02, y: 0.5});
    await selectContainer(page, ELEMENT_ID);
    await connectElements(page, ELEMENT_ID, 'End', 'Flow_out');
    await selectContainer(page, ELEMENT_ID);
}

async function configureAdHocCompletion(page: Page): Promise<void> {
    await openGroup(page, 'adHocCompletion');
    await fillEntry(page, 'completionCondition', 'true');
    const cancel = entry(page, 'cancelRemainingInstances').getByRole('checkbox');
    await setCheckbox(cancel, false);
    await expect(cancel).not.toBeChecked();
}

async function editAdHocSubProcessProperties(page: Page): Promise<string> {
    await openGroup(page, 'general');
    await fillEntry(page, 'name', 'ad hoc sub process edited');
    const editedId = `${ELEMENT_ID}_edited`;
    await editMetadata(page, editedId);
    await editExtensionProperties(page, editedId);
    await editExampleData(page);
    return editedId;
}

async function expectAdHocSubProcessXml(page: Page, xml: string, id: string): Promise<void> {
    await expectValidBpmnXml(page, xml);
    await expectXmlElements(page, xml, `[id="${id}"]`, [{name: 'adHocSubProcess'}]);
    await expectXmlElements(page, xml, `BPMNShape[bpmnElement="${id}"]`, [{name: 'BPMNShape'}]);
    await expectXmlElements(page, xml, `[id="${id}"] > :is(startEvent, endEvent)`, []);
    await expectXmlElements(page, xml, `[id="${id}"] > userTask`, [{attributes: {id: 'Inner_task'}}]);
}
