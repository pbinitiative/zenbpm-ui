import {test, type Page} from '@playwright/test';

import {
    appendTaskToNewProcess,
    selectShape,
    changeElement,
    toggleMarker,
    downloadBpmnXml,
    expectPropertiesRoundTrip,
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
    editMultiInstance,
} from '../../helpers/commonProperties';
import {expectXmlElements, expectValidBpmnXml} from '../../helpers/bpmnAssertions';
import {deployProcess, expectDeploymentRejected} from '../../helpers/processDeployment';

const ELEMENT_ID = 'Element_under_test';
const PROPERTY_GROUPS = [
    ...COMMON_PROPERTY_GROUPS,
    'zenbpm-ioMapping-inputs',
    'zenbpm-ioMapping-outputs',
    'zenbpm-taskDefinition',
];

test.describe('Script task', () => {
    test.beforeEach(async ({page}) => {
        await appendTaskToNewProcess(page, ELEMENT_ID);
        await changeElement(page, 'Script task');
    });

    test('designs the element and exports its BPMN type and variant', async ({page}) => {
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
    });

    test('shows, edits and persists properties through XML import', async ({page}) => {
        const editedId = await editScriptTaskProperties(page);
        await configureScriptTask(page);
        await expectPropertyGroups(page, PROPERTY_GROUPS);
        const xml = await expectPropertiesRoundTrip(page, () => selectShape(page, editedId));
        expectMetadataXml(xml);
        await expectDesign(page, xml, editedId);
    });

    test('rejects unsupported deployment with a specific validation error', async ({page}) => {
        await configureScriptTask(page);
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
        const response = await deployProcess(page);
        await expectDeploymentRejected(page, response, 'unsupported element type \'scriptTask\'');
    });

    async function expectDesign(page: Page, xml: string, id: string): Promise<void> {
        await expectScriptTaskXml(page, xml, id);
        await expectXmlElements(page, xml, `[id="${id}"] > :is(multiInstanceLoopCharacteristics, standardLoopCharacteristics)`, []);
    }
});

test.describe('Script task — parallel loop', () => {
    test.beforeEach(async ({page}) => {
        await appendTaskToNewProcess(page, ELEMENT_ID);
        await changeElement(page, 'Script task');
        await toggleMarker(page, 'Parallel multi-instance');
    });

    test('designs the element and exports its BPMN type and variant', async ({page}) => {
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
    });

    test('shows, edits and persists properties through XML import', async ({page}) => {
        const editedId = await editScriptTaskProperties(page);
        await configureScriptTask(page);
        await editMultiInstance(page);
        await expectPropertyGroups(page, [...PROPERTY_GROUPS, 'multiInstance']);
        const xml = await expectPropertiesRoundTrip(page, () => selectShape(page, editedId));
        expectMetadataXml(xml);
        await expectDesign(page, xml, editedId);
    });

    test('rejects unsupported deployment with a specific validation error', async ({page}) => {
        await configureScriptTask(page);
        await editMultiInstance(page);
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
        const response = await deployProcess(page);
        await expectDeploymentRejected(page, response, 'unsupported element type \'scriptTask\'');
    });

    async function expectDesign(page: Page, xml: string, id: string): Promise<void> {
        await expectScriptTaskXml(page, xml, id);
        await expectXmlElements(page, xml, `[id="${id}"] > :is(multiInstanceLoopCharacteristics, standardLoopCharacteristics)`, [{name: 'multiInstanceLoopCharacteristics'}]);
        await expectXmlElements(page, xml, `[id="${id}"] > multiInstanceLoopCharacteristics[isSequential="true"]`, []);
    }
});

test.describe('Script task — sequential loop', () => {
    test.beforeEach(async ({page}) => {
        await appendTaskToNewProcess(page, ELEMENT_ID);
        await changeElement(page, 'Script task');
        await toggleMarker(page, 'Sequential multi-instance');
    });

    test('designs the element and exports its BPMN type and variant', async ({page}) => {
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
    });

    test('shows, edits and persists properties through XML import', async ({page}) => {
        const editedId = await editScriptTaskProperties(page);
        await configureScriptTask(page);
        await editMultiInstance(page);
        await expectPropertyGroups(page, [...PROPERTY_GROUPS, 'multiInstance']);
        const xml = await expectPropertiesRoundTrip(page, () => selectShape(page, editedId));
        expectMetadataXml(xml);
        await expectDesign(page, xml, editedId);
    });

    test('rejects unsupported deployment with a specific validation error', async ({page}) => {
        await configureScriptTask(page);
        await editMultiInstance(page);
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
        const response = await deployProcess(page);
        await expectDeploymentRejected(page, response, 'unsupported element type \'scriptTask\'');
    });

    async function expectDesign(page: Page, xml: string, id: string): Promise<void> {
        await expectScriptTaskXml(page, xml, id);
        await expectXmlElements(page, xml, `[id="${id}"] > :is(multiInstanceLoopCharacteristics, standardLoopCharacteristics)`, [{name: 'multiInstanceLoopCharacteristics'}]);
        await expectXmlElements(page, xml, `[id="${id}"] > multiInstanceLoopCharacteristics`, [{attributes: {isSequential: 'true'}}]);
    }
});

test.describe('Script task — standard loop', () => {
    test.beforeEach(async ({page}) => {
        await appendTaskToNewProcess(page, ELEMENT_ID);
        await changeElement(page, 'Script task');
        await toggleMarker(page, 'Loop');
    });

    test('designs the element and exports its BPMN type and variant', async ({page}) => {
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
    });

    test('shows, edits and persists properties through XML import', async ({page}) => {
        const editedId = await editScriptTaskProperties(page);
        await configureScriptTask(page);
        await expectPropertyGroups(page, PROPERTY_GROUPS);
        const xml = await expectPropertiesRoundTrip(page, () => selectShape(page, editedId));
        expectMetadataXml(xml);
        await expectDesign(page, xml, editedId);
    });

    test('rejects unsupported deployment with a specific validation error', async ({page}) => {
        await configureScriptTask(page);
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
        const response = await deployProcess(page);
        await expectDeploymentRejected(page, response, 'unsupported element type \'scriptTask\'');
    });

    async function expectDesign(page: Page, xml: string, id: string): Promise<void> {
        await expectScriptTaskXml(page, xml, id);
        await expectXmlElements(page, xml, `[id="${id}"] > :is(multiInstanceLoopCharacteristics, standardLoopCharacteristics)`, [{name: 'standardLoopCharacteristics'}]);
    }
});

async function configureScriptTask(page: Page): Promise<void> {
    await openGroup(page, 'zenbpm-taskDefinition');
    await fillEntry(page, 'zenbpm-taskDef-type', 'e2e-worker');
    await fillEntry(page, 'zenbpm-taskDef-retries', '3');
}

async function editScriptTaskProperties(page: Page): Promise<string> {
    await openGroup(page, 'general');
    await fillEntry(page, 'name', 'script task edited');
    const editedId = `${ELEMENT_ID}_edited`;
    await editMetadata(page, editedId);
    await editInputMappings(page, editedId);
    await editOutputMappings(page, editedId);
    await editExtensionProperties(page, editedId);
    await editExampleData(page);
    return editedId;
}

async function expectScriptTaskXml(page: Page, xml: string, id: string): Promise<void> {
    await expectValidBpmnXml(page, xml);
    await expectXmlElements(page, xml, `[id="${id}"]`, [{name: 'scriptTask'}]);
    await expectXmlElements(page, xml, `BPMNShape[bpmnElement="${id}"]`, [{name: 'BPMNShape'}]);
}
