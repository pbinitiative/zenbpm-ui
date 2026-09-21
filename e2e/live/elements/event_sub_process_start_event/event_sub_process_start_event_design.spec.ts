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
    editTimer,
} from '../../helpers/eventProperties';
import {expectXmlElements, expectEventDefinitions, expectValidBpmnXml} from '../../helpers/bpmnAssertions';
import {deployProcess, expectDeploymentSaved} from '../../helpers/processDeployment';

const ELEMENT_ID = 'Element_under_test';
const PROPERTY_GROUPS = [
    ...COMMON_PROPERTY_GROUPS,
    'zenbpm-ioMapping-outputs',
];

test.describe('Message start event — interrupting', () => {
    test.beforeEach(async ({page}) => {
        await createEventSubprocessStartDiagram(page);
        await selectShape(page, ELEMENT_ID);
        await changeElement(page, 'Message start event');
    });

    test('designs the element and exports its BPMN type and variant', async ({page}) => {
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
    });

    test('shows, edits and persists properties through XML import', async ({page}) => {
        const editedId = await editEventSubProcessStartEventProperties(page);
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
        await expectEventSubProcessStartEventXml(page, xml, id);
        await expectEventDefinitions(page, xml, id, ['messageEventDefinition']);
    }
});

test.describe('Message start event — non-interrupting', () => {
    test.beforeEach(async ({page}) => {
        await createEventSubprocessStartDiagram(page);
        await selectShape(page, ELEMENT_ID);
        await changeElement(page, 'Message start event (non-interrupting)');
    });

    test('designs the element and exports its BPMN type and variant', async ({page}) => {
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
    });

    test('shows, edits and persists properties through XML import', async ({page}) => {
        const editedId = await editEventSubProcessStartEventProperties(page);
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
        await expectEventSubProcessStartEventXml(page, xml, id);
        await expectEventDefinitions(page, xml, id, ['messageEventDefinition']);
        await expectXmlElements(page, xml, `[id="${id}"]`, [{attributes: {isInterrupting: 'false'}}]);
    }
});

test.describe('Timer start event — timeDuration — interrupting', () => {
    test.beforeEach(async ({page}) => {
        await createEventSubprocessStartDiagram(page);
        await selectShape(page, ELEMENT_ID);
        await changeElement(page, 'Timer start event');
    });

    test('designs the element and exports its BPMN type and variant', async ({page}) => {
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
    });

    test('shows, edits and persists properties through XML import', async ({page}) => {
        const editedId = await editEventSubProcessStartEventProperties(page);
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
        await expectEventSubProcessStartEventXml(page, xml, id);
        await expectEventDefinitions(page, xml, id, ['timerEventDefinition']);
    }
});

test.describe('Timer start event — timeDuration — non-interrupting', () => {
    test.beforeEach(async ({page}) => {
        await createEventSubprocessStartDiagram(page);
        await selectShape(page, ELEMENT_ID);
        await changeElement(page, 'Timer start event (non-interrupting)');
    });

    test('designs the element and exports its BPMN type and variant', async ({page}) => {
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
    });

    test('shows, edits and persists properties through XML import', async ({page}) => {
        const editedId = await editEventSubProcessStartEventProperties(page);
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
        await expectEventSubProcessStartEventXml(page, xml, id);
        await expectEventDefinitions(page, xml, id, ['timerEventDefinition']);
        await expectXmlElements(page, xml, `[id="${id}"]`, [{attributes: {isInterrupting: 'false'}}]);
    }
});

test.describe('Conditional start event — interrupting', () => {
    test.beforeEach(async ({page}) => {
        await createEventSubprocessStartDiagram(page);
        await selectShape(page, ELEMENT_ID);
        await changeElement(page, 'Conditional start event');
    });

    test('designs the element and exports its BPMN type and variant', async ({page}) => {
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
    });

    test('shows, edits and persists properties through XML import', async ({page}) => {
        const editedId = await editEventSubProcessStartEventProperties(page);
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
        await expectEventSubProcessStartEventXml(page, xml, id);
        await expectEventDefinitions(page, xml, id, ['conditionalEventDefinition']);
    }
});

test.describe('Conditional start event — non-interrupting', () => {
    test.beforeEach(async ({page}) => {
        await createEventSubprocessStartDiagram(page);
        await selectShape(page, ELEMENT_ID);
        await changeElement(page, 'Conditional start event (non-interrupting)');
    });

    test('designs the element and exports its BPMN type and variant', async ({page}) => {
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
    });

    test('shows, edits and persists properties through XML import', async ({page}) => {
        const editedId = await editEventSubProcessStartEventProperties(page);
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
        await expectEventSubProcessStartEventXml(page, xml, id);
        await expectEventDefinitions(page, xml, id, ['conditionalEventDefinition']);
        await expectXmlElements(page, xml, `[id="${id}"]`, [{attributes: {isInterrupting: 'false'}}]);
    }
});

test.describe('Signal start event — interrupting', () => {
    test.beforeEach(async ({page}) => {
        await createEventSubprocessStartDiagram(page);
        await selectShape(page, ELEMENT_ID);
        await changeElement(page, 'Signal start event');
    });

    test('designs the element and exports its BPMN type and variant', async ({page}) => {
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
    });

    test('shows, edits and persists properties through XML import', async ({page}) => {
        const editedId = await editEventSubProcessStartEventProperties(page);
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
        await expectEventSubProcessStartEventXml(page, xml, id);
        await expectEventDefinitions(page, xml, id, ['signalEventDefinition']);
    }
});

test.describe('Signal start event — non-interrupting', () => {
    test.beforeEach(async ({page}) => {
        await createEventSubprocessStartDiagram(page);
        await selectShape(page, ELEMENT_ID);
        await changeElement(page, 'Signal start event (non-interrupting)');
    });

    test('designs the element and exports its BPMN type and variant', async ({page}) => {
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
    });

    test('shows, edits and persists properties through XML import', async ({page}) => {
        const editedId = await editEventSubProcessStartEventProperties(page);
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
        await expectEventSubProcessStartEventXml(page, xml, id);
        await expectEventDefinitions(page, xml, id, ['signalEventDefinition']);
        await expectXmlElements(page, xml, `[id="${id}"]`, [{attributes: {isInterrupting: 'false'}}]);
    }
});

test.describe('Error start event', () => {
    test.beforeEach(async ({page}) => {
        await createEventSubprocessStartDiagram(page);
        await selectShape(page, ELEMENT_ID);
        await changeElement(page, 'Error start event');
    });

    test('designs the element and exports its BPMN type and variant', async ({page}) => {
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
    });

    test('shows, edits and persists properties through XML import', async ({page}) => {
        const editedId = await editEventSubProcessStartEventProperties(page);
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
        await expectEventSubProcessStartEventXml(page, xml, id);
        await expectEventDefinitions(page, xml, id, ['errorEventDefinition']);
    }
});

test.describe('Escalation start event — interrupting', () => {
    test.beforeEach(async ({page}) => {
        await createEventSubprocessStartDiagram(page);
        await selectShape(page, ELEMENT_ID);
        await changeElement(page, 'Escalation start event');
    });

    test('designs the element and exports its BPMN type and variant', async ({page}) => {
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
    });

    test('shows, edits and persists properties through XML import', async ({page}) => {
        const editedId = await editEventSubProcessStartEventProperties(page);
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
        await expectEventSubProcessStartEventXml(page, xml, id);
        await expectEventDefinitions(page, xml, id, ['escalationEventDefinition']);
    }
});

test.describe('Escalation start event — non-interrupting', () => {
    test.beforeEach(async ({page}) => {
        await createEventSubprocessStartDiagram(page);
        await selectShape(page, ELEMENT_ID);
        await changeElement(page, 'Escalation start event (non-interrupting)');
    });

    test('designs the element and exports its BPMN type and variant', async ({page}) => {
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
    });

    test('shows, edits and persists properties through XML import', async ({page}) => {
        const editedId = await editEventSubProcessStartEventProperties(page);
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
        await expectEventSubProcessStartEventXml(page, xml, id);
        await expectEventDefinitions(page, xml, id, ['escalationEventDefinition']);
        await expectXmlElements(page, xml, `[id="${id}"]`, [{attributes: {isInterrupting: 'false'}}]);
    }
});

test.describe('Compensation start event', () => {
    test.beforeEach(async ({page}) => {
        await createEventSubprocessStartDiagram(page);
        await selectShape(page, ELEMENT_ID);
        await changeElement(page, 'Compensation start event');
    });

    test('designs the element and exports its BPMN type and variant', async ({page}) => {
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
    });

    test('shows, edits and persists properties through XML import', async ({page}) => {
        const editedId = await editEventSubProcessStartEventProperties(page);
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
        await expectEventSubProcessStartEventXml(page, xml, id);
        await expectEventDefinitions(page, xml, id, ['compensateEventDefinition']);
    }
});

async function createEventSubprocessStartDiagram(page: Page): Promise<void> {
    await createProcess(page);
    await appendElement(page, 'Start', 'Append end event', 'End');
    const children = await createFromPalette(page, 'Create expanded sub-process', {x: 450, y: 450}, 'Subprocess');
    expect(children).toHaveLength(1);
    await selectShape(page, children[0]);
    await renameSelectedElement(page, ELEMENT_ID);
    await appendElement(page, ELEMENT_ID, 'Append task', 'Inner_task');
    await changeElement(page, 'User task');
    await appendElement(page, 'Inner_task', 'Append end event', 'Inner_end');
    await selectContainer(page, 'Subprocess');
    await changeElement(page, 'Event sub-process');
}

async function editEventSubProcessStartEventProperties(page: Page): Promise<string> {
    await openGroup(page, 'general');
    await fillEntry(page, 'name', 'event sub process start event edited');
    const editedId = `${ELEMENT_ID}_edited`;
    await editMetadata(page, editedId);
    await editOutputMappings(page, editedId);
    await editExtensionProperties(page, editedId);
    await editExampleData(page);
    return editedId;
}

async function expectEventSubProcessStartEventXml(page: Page, xml: string, id: string): Promise<void> {
    await expectValidBpmnXml(page, xml);
    await expectXmlElements(page, xml, `[id="${id}"]`, [{name: 'startEvent'}]);
    await expectXmlElements(page, xml, `BPMNShape[bpmnElement="${id}"]`, [{name: 'BPMNShape'}]);
    await expectXmlElements(page, xml, '[id="Subprocess"]', [{attributes: {triggeredByEvent: 'true'}}]);
    await expectXmlElements(page, xml, '[id="Subprocess"] > startEvent', [{attributes: {id}}]);
    await expectXmlElements(page, xml, '[id="Subprocess"] > sequenceFlow', [
        {attributes: {sourceRef: id, targetRef: 'Inner_task'}},
        {attributes: {sourceRef: 'Inner_task', targetRef: 'Inner_end'}},
    ]);
    await expectXmlElements(page, xml, '[sourceRef="Subprocess"], [targetRef="Subprocess"]', []);
}
