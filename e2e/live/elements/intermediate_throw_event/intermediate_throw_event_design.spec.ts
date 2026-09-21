import {expect, test, type Page} from '@playwright/test';

import {
    selectShape,
    changeElement,
    downloadBpmnXml,
    expectPropertiesRoundTrip,
    createProcess,
    appendElement,
    createFromPalette,
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

test.describe('Intermediate throw event', () => {
    test.beforeEach(async ({page}) => {
        await createIntermediateDiagram(page);
        await selectShape(page, ELEMENT_ID);
    });

    test('designs the element and exports its BPMN type and variant', async ({page}) => {
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
    });

    test('shows, edits and persists properties through XML import', async ({page}) => {
        const editedId = await editIntermediateThrowEventProperties(page);
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
        await expectIntermediateThrowEventXml(page, xml, id);
        await expectEventDefinitions(page, xml, id, []);
    }
});

test.describe('Message intermediate throw event', () => {
    test.beforeEach(async ({page}) => {
        await createIntermediateDiagram(page);
        await selectShape(page, ELEMENT_ID);
        await changeElement(page, 'Message intermediate throw event');
    });

    test('designs the element and exports its BPMN type and variant', async ({page}) => {
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
    });

    test('shows, edits and persists properties through XML import', async ({page}) => {
        const editedId = await editIntermediateThrowEventProperties(page);
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
        await expectIntermediateThrowEventXml(page, xml, id);
        await expectEventDefinitions(page, xml, id, ['messageEventDefinition']);
    }
});

test.describe('Escalation intermediate throw event', () => {
    test.beforeEach(async ({page}) => {
        await createIntermediateDiagram(page);
        await selectShape(page, ELEMENT_ID);
        await changeElement(page, 'Escalation intermediate throw event');
    });

    test('designs the element and exports its BPMN type and variant', async ({page}) => {
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
    });

    test('shows, edits and persists properties through XML import', async ({page}) => {
        const editedId = await editIntermediateThrowEventProperties(page);
        await editEscalationReference(page);
        await expectPropertyGroups(page, [...PROPERTY_GROUPS, 'escalation']);
        const xml = await expectPropertiesRoundTrip(page, () => selectShape(page, editedId));
        expectMetadataXml(xml);
        await expectDesign(page, xml, editedId);
    });

    test('rejects unsupported deployment with a specific validation error', async ({page}) => {
        await editEscalationReference(page);
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
        const response = await deployProcess(page);
        await expectDeploymentRejected(page, response, 'unsupported event definition \'escalationEventDefinition\'');
    });

    async function expectDesign(page: Page, xml: string, id: string): Promise<void> {
        await expectIntermediateThrowEventXml(page, xml, id);
        await expectEventDefinitions(page, xml, id, ['escalationEventDefinition']);
    }
});

test.describe('Link intermediate throw event', () => {
    test.beforeEach(async ({page}) => {
        await createLinkThrowDiagram(page);
        await selectShape(page, ELEMENT_ID);
        await changeElement(page, 'Link intermediate throw event');
    });

    test('designs the element and exports its BPMN type and variant', async ({page}) => {
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
    });

    test('shows, edits and persists properties through XML import', async ({page}) => {
        const editedId = await editIntermediateThrowEventProperties(page);
        await openGroup(page, 'link');
        await fillEntry(page, 'linkName', 'e2e-link');
        await expectPropertyGroups(page, [...PROPERTY_GROUPS, 'link']);
        const xml = await expectPropertiesRoundTrip(page, () => selectShape(page, editedId));
        expectMetadataXml(xml);
        await expectDesign(page, xml, editedId);
    });

    test('deploys the designed process and reads back its BPMN XML', async ({page}) => {
        await openGroup(page, 'link');
        await fillEntry(page, 'linkName', 'e2e-link');
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
        const response = await deployProcess(page);
        await expectDeploymentSaved(page, response, xml);
    });

    async function expectDesign(page: Page, xml: string, id: string): Promise<void> {
        await expectIntermediateThrowEventXml(page, xml, id);
        await expectEventDefinitions(page, xml, id, ['linkEventDefinition']);
    }
});

test.describe('Compensation intermediate throw event', () => {
    test.beforeEach(async ({page}) => {
        await createIntermediateDiagram(page);
        await selectShape(page, ELEMENT_ID);
        await changeElement(page, 'Compensation intermediate throw event');
    });

    test('designs the element and exports its BPMN type and variant', async ({page}) => {
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
    });

    test('shows, edits and persists properties through XML import', async ({page}) => {
        const editedId = await editIntermediateThrowEventProperties(page);
        await configureCompensation(page);
        await expectPropertyGroups(page, [...PROPERTY_GROUPS, 'compensation']);
        const xml = await expectPropertiesRoundTrip(page, () => selectShape(page, editedId));
        expectMetadataXml(xml);
        await expectDesign(page, xml, editedId);
    });

    test('rejects unsupported deployment with a specific validation error', async ({page}) => {
        await configureCompensation(page);
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
        const response = await deployProcess(page);
        await expectDeploymentRejected(page, response, 'unsupported event definition \'compensateEventDefinition\'');
    });

    async function expectDesign(page: Page, xml: string, id: string): Promise<void> {
        await expectIntermediateThrowEventXml(page, xml, id);
        await expectEventDefinitions(page, xml, id, ['compensateEventDefinition']);
    }
});

test.describe('Signal intermediate throw event', () => {
    test.beforeEach(async ({page}) => {
        await createIntermediateDiagram(page);
        await selectShape(page, ELEMENT_ID);
        await changeElement(page, 'Signal intermediate throw event');
    });

    test('designs the element and exports its BPMN type and variant', async ({page}) => {
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
    });

    test('shows, edits and persists properties through XML import', async ({page}) => {
        const editedId = await editIntermediateThrowEventProperties(page);
        await editSignalReference(page);
        await expectPropertyGroups(page, [...PROPERTY_GROUPS, 'signal']);
        const xml = await expectPropertiesRoundTrip(page, () => selectShape(page, editedId));
        expectMetadataXml(xml);
        await expectDesign(page, xml, editedId);
    });

    test('rejects unsupported deployment with a specific validation error', async ({page}) => {
        await editSignalReference(page);
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
        const response = await deployProcess(page);
        await expectDeploymentRejected(page, response, 'unsupported event definition \'signalEventDefinition\'');
    });

    async function expectDesign(page: Page, xml: string, id: string): Promise<void> {
        await expectIntermediateThrowEventXml(page, xml, id);
        await expectEventDefinitions(page, xml, id, ['signalEventDefinition']);
    }
});

async function createIntermediateDiagram(page: Page): Promise<void> {
    await createProcess(page);
    await appendElement(page, 'Start', 'Append intermediate/boundary event', ELEMENT_ID);
    await appendElement(page, ELEMENT_ID, 'Append end event', 'End');
}

async function createLinkThrowDiagram(page: Page): Promise<void> {
    await createProcess(page);
    await appendElement(page, 'Start', 'Append intermediate/boundary event', ELEMENT_ID);
    await createFromPalette(page, 'Create intermediate/boundary event', {x: 600, y: 180}, 'Link_catch');
    await changeElement(page, 'Link intermediate catch event');
    await openGroup(page, 'link');
    await fillEntry(page, 'linkName', 'e2e-link');
    await appendElement(page, 'Link_catch', 'Append end event', 'End');
}

async function configureCompensation(page: Page): Promise<void> {
    await openGroup(page, 'compensation');
    const wait = entry(page, 'waitForCompletion').getByRole('checkbox');
    await setCheckbox(wait, false);
    await expect(wait).not.toBeChecked();
    await setCheckbox(wait, true);
}

async function editIntermediateThrowEventProperties(page: Page): Promise<string> {
    await openGroup(page, 'general');
    await fillEntry(page, 'name', 'intermediate throw event edited');
    const editedId = `${ELEMENT_ID}_edited`;
    await editMetadata(page, editedId);
    await editInputMappings(page, editedId);
    await editOutputMappings(page, editedId);
    await editExtensionProperties(page, editedId);
    await editExampleData(page);
    return editedId;
}

async function expectIntermediateThrowEventXml(page: Page, xml: string, id: string): Promise<void> {
    await expectValidBpmnXml(page, xml);
    await expectXmlElements(page, xml, `[id="${id}"]`, [{name: 'intermediateThrowEvent'}]);
    await expectXmlElements(page, xml, `BPMNShape[bpmnElement="${id}"]`, [{name: 'BPMNShape'}]);
}
