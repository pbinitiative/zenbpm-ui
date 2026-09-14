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
    connectElements,
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
    editInputMappings,
    editOutputMappings,
    editExtensionProperties,
    editExampleData,
    expectMetadataXml,
} from '../../helpers/commonProperties';
import {
    editMessageReference,
    editSignalReference,
    editErrorReference,
    editEscalationReference,
} from '../../helpers/eventProperties';
import {expectXmlElements, expectEventDefinitions, expectValidBpmnXml} from '../../helpers/bpmnAssertions';
import {
    deployProcess,
    expectDeploymentSaved,
    expectDeploymentRejected,
} from '../../helpers/processDeployment';

const ELEMENT_ID = 'Element_under_test';
const PROPERTY_GROUPS = [
    ...COMMON_PROPERTY_GROUPS,
    'zenbpm-ioMapping-inputs',
    'zenbpm-ioMapping-outputs',
];

test.describe('End event', () => {
    test.beforeEach(async ({page}) => {
        await createEndDiagram(page);
        await selectShape(page, ELEMENT_ID);
    });

    test('designs the element and exports its BPMN type and variant', async ({page}) => {
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
    });

    test('shows, edits and persists properties through XML import', async ({page}) => {
        const editedId = await editEndEventProperties(page);
        await expectPropertyGroups(page, PROPERTY_GROUPS);
        const xml = await expectPropertiesRoundTrip(page, () => selectShape(page, editedId));
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
        await expectEndEventXml(page, xml, id);
        await expectEventDefinitions(page, xml, id, []);
    }
});

test.describe('Message end event', () => {
    test.beforeEach(async ({page}) => {
        await createEndDiagram(page);
        await selectShape(page, ELEMENT_ID);
        await changeElement(page, 'Message end event');
    });

    test('designs the element and exports its BPMN type and variant', async ({page}) => {
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
    });

    test('shows, edits and persists properties through XML import', async ({page}) => {
        const editedId = await editEndEventProperties(page);
        await editMessageReference(page);
        await expectPropertyGroups(page, [...PROPERTY_GROUPS, 'message']);
        const xml = await expectPropertiesRoundTrip(page, () => selectShape(page, editedId));
        expectMetadataXml(xml);
        await expectDesign(page, xml, editedId);
    });

    test('deploys the designed process and reads back its BPMN XML', async ({page}) => {
        await editMessageReference(page);
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
        const response = await deployProcess(page);
        await expectDeploymentSaved(page, response, xml);
    });

    async function expectDesign(page: Page, xml: string, id: string): Promise<void> {
        await expectEndEventXml(page, xml, id);
        await expectEventDefinitions(page, xml, id, ['messageEventDefinition']);
    }
});

test.describe('Escalation end event', () => {
    test.beforeEach(async ({page}) => {
        await createEndDiagram(page);
        await selectShape(page, ELEMENT_ID);
        await changeElement(page, 'Escalation end event');
    });

    test('designs the element and exports its BPMN type and variant', async ({page}) => {
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
    });

    test('shows, edits and persists properties through XML import', async ({page}) => {
        const editedId = await editEndEventProperties(page);
        await editEscalationReference(page);
        await expectPropertyGroups(page, [...PROPERTY_GROUPS, 'escalation']);
        const xml = await expectPropertiesRoundTrip(page, () => selectShape(page, editedId));
        expectMetadataXml(xml);
        await expectDesign(page, xml, editedId);
    });

    test('deploys the designed process and reads back its BPMN XML', async ({page}) => {
        await editEscalationReference(page);
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
        const response = await deployProcess(page);
        await expectDeploymentSaved(page, response, xml);
    });

    async function expectDesign(page: Page, xml: string, id: string): Promise<void> {
        await expectEndEventXml(page, xml, id);
        await expectEventDefinitions(page, xml, id, ['escalationEventDefinition']);
    }
});

test.describe('Error end event', () => {
    test.beforeEach(async ({page}) => {
        await createEndDiagram(page);
        await selectShape(page, ELEMENT_ID);
        await changeElement(page, 'Error end event');
    });

    test('designs the element and exports its BPMN type and variant', async ({page}) => {
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
    });

    test('shows, edits and persists properties through XML import', async ({page}) => {
        const editedId = await editEndEventProperties(page);
        await editErrorReference(page);
        await expectPropertyGroups(page, [...PROPERTY_GROUPS, 'error']);
        const xml = await expectPropertiesRoundTrip(page, () => selectShape(page, editedId));
        expectMetadataXml(xml);
        await expectDesign(page, xml, editedId);
    });

    test('deploys the designed process and reads back its BPMN XML', async ({page}) => {
        await editErrorReference(page);
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
        const response = await deployProcess(page);
        await expectDeploymentSaved(page, response, xml);
    });

    async function expectDesign(page: Page, xml: string, id: string): Promise<void> {
        await expectEndEventXml(page, xml, id);
        await expectEventDefinitions(page, xml, id, ['errorEventDefinition']);
    }
});

test.describe('Compensation end event', () => {
    test.beforeEach(async ({page}) => {
        await createEndDiagram(page);
        await selectShape(page, ELEMENT_ID);
        await changeElement(page, 'Compensation end event');
    });

    test('designs the element and exports its BPMN type and variant', async ({page}) => {
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
    });

    test('shows, edits and persists properties through XML import', async ({page}) => {
        const editedId = await editEndEventProperties(page);
        await configureCompensation(page);
        await expectPropertyGroups(page, [...PROPERTY_GROUPS, 'compensation']);
        const xml = await expectPropertiesRoundTrip(page, () => selectShape(page, editedId));
        expectMetadataXml(xml);
        await expectDesign(page, xml, editedId);
    });

    test('deploys the designed process and reads back its BPMN XML', async ({page}) => {
        await configureCompensation(page);
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
        const response = await deployProcess(page);
        await expectDeploymentSaved(page, response, xml);
    });

    async function expectDesign(page: Page, xml: string, id: string): Promise<void> {
        await expectEndEventXml(page, xml, id);
        await expectEventDefinitions(page, xml, id, ['compensateEventDefinition']);
    }
});

test.describe('Signal end event', () => {
    test.beforeEach(async ({page}) => {
        await createEndDiagram(page);
        await selectShape(page, ELEMENT_ID);
        await changeElement(page, 'Signal end event');
    });

    test('designs the element and exports its BPMN type and variant', async ({page}) => {
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
    });

    test('shows, edits and persists properties through XML import', async ({page}) => {
        const editedId = await editEndEventProperties(page);
        await editSignalReference(page);
        await expectPropertyGroups(page, [...PROPERTY_GROUPS, 'signal']);
        const xml = await expectPropertiesRoundTrip(page, () => selectShape(page, editedId));
        expectMetadataXml(xml);
        await expectDesign(page, xml, editedId);
    });

    test('deploys the designed process and reads back its BPMN XML', async ({page}) => {
        await editSignalReference(page);
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
        const response = await deployProcess(page);
        await expectDeploymentSaved(page, response, xml);
    });

    async function expectDesign(page: Page, xml: string, id: string): Promise<void> {
        await expectEndEventXml(page, xml, id);
        await expectEventDefinitions(page, xml, id, ['signalEventDefinition']);
    }
});

test.describe('Terminate end event', () => {
    test.beforeEach(async ({page}) => {
        await createEndDiagram(page);
        await selectShape(page, ELEMENT_ID);
        await changeElement(page, 'Terminate end event');
    });

    test('designs the element and exports its BPMN type and variant', async ({page}) => {
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
    });

    test('shows, edits and persists properties through XML import', async ({page}) => {
        const editedId = await editEndEventProperties(page);
        await expectPropertyGroups(page, PROPERTY_GROUPS);
        const xml = await expectPropertiesRoundTrip(page, () => selectShape(page, editedId));
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
        await expectEndEventXml(page, xml, id);
        await expectEventDefinitions(page, xml, id, ['terminateEventDefinition']);
    }
});

test.describe('Cancel end event', () => {
    test.beforeEach(async ({page}) => {
        await createCancelEndDiagram(page);
        await selectShape(page, ELEMENT_ID);
        await changeElement(page, 'Cancel end event');
    });

    test('designs the element and exports its BPMN type and variant', async ({page}) => {
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
    });

    test('shows, edits and persists properties through XML import', async ({page}) => {
        const editedId = await editEndEventProperties(page);
        await expectPropertyGroups(page, PROPERTY_GROUPS);
        const xml = await expectPropertiesRoundTrip(page, () => selectShape(page, editedId));
        expectMetadataXml(xml);
        await expectDesign(page, xml, editedId);
    });

    test('rejects unsupported deployment with a specific validation error', async ({page}) => {
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
        const response = await deployProcess(page);
        await expectDeploymentRejected(page, response, 'no registered BaseElement with ID [Subprocess]');
    });

    async function expectDesign(page: Page, xml: string, id: string): Promise<void> {
        await expectEndEventXml(page, xml, id);
        await expectEventDefinitions(page, xml, id, ['cancelEventDefinition']);
    }
});

async function createEndDiagram(page: Page): Promise<void> {
    await createProcess(page);
    await appendElement(page, 'Start', 'Append end event', ELEMENT_ID);
}

async function createCancelEndDiagram(page: Page): Promise<void> {
    await createProcess(page);
    const children = await createFromPalette(page, 'Create expanded sub-process', {x: 450, y: 250}, 'Subprocess');
    expect(children).toHaveLength(1);
    await selectShape(page, children[0]);
    await renameSelectedElement(page, 'Inner_start');
    await appendElement(page, 'Inner_start', 'Append task', 'Inner_task');
    await changeElement(page, 'User task');
    await appendElement(page, 'Inner_task', 'Append end event', ELEMENT_ID);
    await createFromPalette(page, 'Create end event', {x: 1000, y: 250}, 'End');
    await connectElements(page, 'Start', 'Subprocess', 'Flow_in', {x: 0.02, y: 0.5});
    await selectContainer(page, 'Subprocess');
    await connectElements(page, 'Subprocess', 'End', 'Flow_out');
    await selectContainer(page, 'Subprocess');
    await changeElement(page, 'Transaction');
}

async function configureCompensation(page: Page): Promise<void> {
    await openGroup(page, 'compensation');
    const wait = entry(page, 'waitForCompletion').getByRole('checkbox');
    await setCheckbox(wait, false);
    await expect(wait).not.toBeChecked();
    await setCheckbox(wait, true);
}

async function editEndEventProperties(page: Page): Promise<string> {
    await openGroup(page, 'general');
    await fillEntry(page, 'name', 'end event edited');
    const editedId = `${ELEMENT_ID}_edited`;
    await editMetadata(page, editedId);
    await editInputMappings(page, editedId);
    await editOutputMappings(page, editedId);
    await editExtensionProperties(page, editedId);
    await editExampleData(page);
    return editedId;
}

async function expectEndEventXml(page: Page, xml: string, id: string): Promise<void> {
    await expectValidBpmnXml(page, xml);
    await expectXmlElements(page, xml, `[id="${id}"]`, [{name: 'endEvent'}]);
    await expectXmlElements(page, xml, `BPMNShape[bpmnElement="${id}"]`, [{name: 'BPMNShape'}]);
}
