import {test, type Page} from '@playwright/test';

import {
    selectShape,
    changeElement,
    downloadBpmnXml,
    expectPropertiesRoundTrip,
    createProcess,
    appendElement,
    createFromPalette,
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
import {editMessageReference, editSignalReference, editTimer} from '../../helpers/eventProperties';
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

test.describe('Message intermediate catch event', () => {
    test.beforeEach(async ({page}) => {
        await createIntermediateDiagram(page);
        await selectShape(page, ELEMENT_ID);
        await changeElement(page, 'Message intermediate catch event');
    });

    test('designs the element and exports its BPMN type and variant', async ({page}) => {
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
    });

    test('shows, edits and persists properties through XML import', async ({page}) => {
        const editedId = await editIntermediateCatchEventProperties(page);
        await editMessageReference(page);
        await fillEntry(page, 'zenbpm-messageSubscriptionCorrelationKey', 'orderId');
        await expectPropertyGroups(page, [...PROPERTY_GROUPS, 'message']);
        const xml = await expectPropertiesRoundTrip(page, () => selectShape(page, editedId));
        expectMetadataXml(xml);
        await expectDesign(page, xml, editedId);
    });

    test('deploys the designed process and reads back its BPMN XML', async ({page}) => {
        await editMessageReference(page);
        await fillEntry(page, 'zenbpm-messageSubscriptionCorrelationKey', 'orderId');
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
        const response = await deployProcess(page);
        await expectDeploymentSaved(page, response, xml);
    });

    async function expectDesign(page: Page, xml: string, id: string): Promise<void> {
        await expectIntermediateCatchEventXml(page, xml, id);
        await expectEventDefinitions(page, xml, id, ['messageEventDefinition']);
    }
});

test.describe('Timer intermediate catch event — timeDate', () => {
    test.beforeEach(async ({page}) => {
        await createIntermediateDiagram(page);
        await selectShape(page, ELEMENT_ID);
        await changeElement(page, 'Timer intermediate catch event');
    });

    test('designs the element and exports its BPMN type and variant', async ({page}) => {
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
    });

    test('shows, edits and persists properties through XML import', async ({page}) => {
        const editedId = await editIntermediateCatchEventProperties(page);
        await editTimer(page, 'timeDate', '2030-01-01T12:00:00Z');
        await expectPropertyGroups(page, [...PROPERTY_GROUPS, 'timer']);
        const xml = await expectPropertiesRoundTrip(page, () => selectShape(page, editedId));
        expectMetadataXml(xml);
        await expectDesign(page, xml, editedId);
    });

    test('deploys the designed process and reads back its BPMN XML', async ({page}) => {
        await editTimer(page, 'timeDate', '2030-01-01T12:00:00Z');
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
        const response = await deployProcess(page);
        await expectDeploymentSaved(page, response, xml);
    });

    async function expectDesign(page: Page, xml: string, id: string): Promise<void> {
        await expectIntermediateCatchEventXml(page, xml, id);
        await expectEventDefinitions(page, xml, id, ['timerEventDefinition']);
    }
});

test.describe('Timer intermediate catch event — timeDuration', () => {
    test.beforeEach(async ({page}) => {
        await createIntermediateDiagram(page);
        await selectShape(page, ELEMENT_ID);
        await changeElement(page, 'Timer intermediate catch event');
    });

    test('designs the element and exports its BPMN type and variant', async ({page}) => {
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
    });

    test('shows, edits and persists properties through XML import', async ({page}) => {
        const editedId = await editIntermediateCatchEventProperties(page);
        await editTimer(page, 'timeDuration', 'PT1H');
        await expectPropertyGroups(page, [...PROPERTY_GROUPS, 'timer']);
        const xml = await expectPropertiesRoundTrip(page, () => selectShape(page, editedId));
        expectMetadataXml(xml);
        await expectDesign(page, xml, editedId);
    });

    test('deploys the designed process and reads back its BPMN XML', async ({page}) => {
        await editTimer(page, 'timeDuration', 'PT1H');
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
        const response = await deployProcess(page);
        await expectDeploymentSaved(page, response, xml);
    });

    async function expectDesign(page: Page, xml: string, id: string): Promise<void> {
        await expectIntermediateCatchEventXml(page, xml, id);
        await expectEventDefinitions(page, xml, id, ['timerEventDefinition']);
    }
});

test.describe('Timer intermediate catch event — timeCycle', () => {
    test.beforeEach(async ({page}) => {
        await createIntermediateDiagram(page);
        await selectShape(page, ELEMENT_ID);
        await changeElement(page, 'Timer intermediate catch event');
    });

    test('designs the element and exports its BPMN type and variant', async ({page}) => {
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
    });

    test('shows, edits and persists properties through XML import', async ({page}) => {
        const editedId = await editIntermediateCatchEventProperties(page);
        await editTimer(page, 'timeCycle', 'R3/PT1H');
        await expectPropertyGroups(page, [...PROPERTY_GROUPS, 'timer']);
        const xml = await expectPropertiesRoundTrip(page, () => selectShape(page, editedId));
        expectMetadataXml(xml);
        await expectDesign(page, xml, editedId);
    });

    test('deploys the designed process and reads back its BPMN XML', async ({page}) => {
        await editTimer(page, 'timeCycle', 'R3/PT1H');
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
        const response = await deployProcess(page);
        await expectDeploymentSaved(page, response, xml);
    });

    async function expectDesign(page: Page, xml: string, id: string): Promise<void> {
        await expectIntermediateCatchEventXml(page, xml, id);
        await expectEventDefinitions(page, xml, id, ['timerEventDefinition']);
    }
});

test.describe('Conditional intermediate catch event', () => {
    test.beforeEach(async ({page}) => {
        await createIntermediateDiagram(page);
        await selectShape(page, ELEMENT_ID);
        await changeElement(page, 'Conditional intermediate catch event');
    });

    test('designs the element and exports its BPMN type and variant', async ({page}) => {
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
    });

    test('shows, edits and persists properties through XML import', async ({page}) => {
        const editedId = await editIntermediateCatchEventProperties(page);
        await expectPropertyGroups(page, PROPERTY_GROUPS);
        const xml = await expectPropertiesRoundTrip(page, () => selectShape(page, editedId));
        expectMetadataXml(xml);
        await expectDesign(page, xml, editedId);
    });

    test('rejects unsupported deployment with a specific validation error', async ({page}) => {
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
        const response = await deployProcess(page);
        await expectDeploymentRejected(page, response, 'unsupported event definition \'conditionalEventDefinition\'');
    });

    async function expectDesign(page: Page, xml: string, id: string): Promise<void> {
        await expectIntermediateCatchEventXml(page, xml, id);
        await expectEventDefinitions(page, xml, id, ['conditionalEventDefinition']);
    }
});

test.describe('Link intermediate catch event', () => {
    test.beforeEach(async ({page}) => {
        await createLinkCatchDiagram(page);
        await selectShape(page, ELEMENT_ID);
        await changeElement(page, 'Link intermediate catch event');
    });

    test('designs the element and exports its BPMN type and variant', async ({page}) => {
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
    });

    test('shows, edits and persists properties through XML import', async ({page}) => {
        const editedId = await editIntermediateCatchEventProperties(page);
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
        await expectIntermediateCatchEventXml(page, xml, id);
        await expectEventDefinitions(page, xml, id, ['linkEventDefinition']);
    }
});

test.describe('Signal intermediate catch event', () => {
    test.beforeEach(async ({page}) => {
        await createIntermediateDiagram(page);
        await selectShape(page, ELEMENT_ID);
        await changeElement(page, 'Signal intermediate catch event');
    });

    test('designs the element and exports its BPMN type and variant', async ({page}) => {
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
    });

    test('shows, edits and persists properties through XML import', async ({page}) => {
        const editedId = await editIntermediateCatchEventProperties(page);
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
        await expectIntermediateCatchEventXml(page, xml, id);
        await expectEventDefinitions(page, xml, id, ['signalEventDefinition']);
    }
});

async function createIntermediateDiagram(page: Page): Promise<void> {
    await createProcess(page);
    await appendElement(page, 'Start', 'Append intermediate/boundary event', ELEMENT_ID);
    await appendElement(page, ELEMENT_ID, 'Append end event', 'End');
}

async function createLinkCatchDiagram(page: Page): Promise<void> {
    await createProcess(page);
    await appendElement(page, 'Start', 'Append intermediate/boundary event', 'Link_throw');
    await changeElement(page, 'Link intermediate throw event');
    await openGroup(page, 'link');
    await fillEntry(page, 'linkName', 'e2e-link');
    await createFromPalette(page, 'Create intermediate/boundary event', {x: 600, y: 180}, ELEMENT_ID);
    await appendElement(page, ELEMENT_ID, 'Append end event', 'End');
}

async function editIntermediateCatchEventProperties(page: Page): Promise<string> {
    await openGroup(page, 'general');
    await fillEntry(page, 'name', 'intermediate catch event edited');
    const editedId = `${ELEMENT_ID}_edited`;
    await editMetadata(page, editedId);
    await editInputMappings(page, editedId);
    await editOutputMappings(page, editedId);
    await editExtensionProperties(page, editedId);
    await editExampleData(page);
    return editedId;
}

async function expectIntermediateCatchEventXml(page: Page, xml: string, id: string): Promise<void> {
    await expectValidBpmnXml(page, xml);
    await expectXmlElements(page, xml, `[id="${id}"]`, [{name: 'intermediateCatchEvent'}]);
    await expectXmlElements(page, xml, `BPMNShape[bpmnElement="${id}"]`, [{name: 'BPMNShape'}]);
}
