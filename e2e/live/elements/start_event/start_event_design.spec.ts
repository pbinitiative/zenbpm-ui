import {expect, test, type Page} from '@playwright/test';

import {
    selectShape,
    changeElement,
    downloadBpmnXml,
    expectPropertiesRoundTrip,
    createProcess,
    appendElement,
    renameSelectedElement,
} from '../../helpers/processDesigner';
import {openGroup, fillEntry, entry, expectPropertyGroups} from '../../helpers/propertiesPanel';
import {
    COMMON_PROPERTY_GROUPS,
    editMetadata,
    editOutputMappings,
    editExtensionProperties,
    editExampleData,
    expectMetadataXml,
} from '../../helpers/commonProperties';
import {editMessageReference, editSignalReference, editTimer} from '../../helpers/eventProperties';
import {expectXmlElements, expectEventDefinitions, expectValidBpmnXml} from '../../helpers/bpmnAssertions';
import {deployProcess, expectDeploymentRejected, expectDeploymentSaved} from '../../helpers/processDeployment';

const ELEMENT_ID = 'Element_under_test';
// Every start event of this spec sits directly under the process, where the
// engine runs its end execution listeners, so each offers the group.
const PROPERTY_GROUPS = [
    ...COMMON_PROPERTY_GROUPS,
    'zenbpm-ioMapping-outputs',
    'zenbpm-executionListener',
];
const LISTENER_GROUP = 'zenbpm-executionListener';
// The entry of a field of the start event's first listener.
const listenerEntry = (id: string, field: 'eventType' | 'type' | 'retries') =>
    `${id}-zenbpm-executionListener-0-${field}`;

test.describe('Start event', () => {
    test.beforeEach(async ({page}) => {
        await createStartDiagram(page);
        await selectShape(page, ELEMENT_ID);
    });

    test('designs the element and exports its BPMN type and variant', async ({page}) => {
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
    });

    test('shows, edits and persists properties through XML import', async ({page}) => {
        const editedId = await editStartEventProperties(page);
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
        await expectStartEventXml(page, xml, id);
        await expectEventDefinitions(page, xml, id, []);
    }
});

test.describe('Message start event', () => {
    test.beforeEach(async ({page}) => {
        await createStartDiagram(page);
        await selectShape(page, ELEMENT_ID);
        await changeElement(page, 'Message start event');
    });

    test('designs the element and exports its BPMN type and variant', async ({page}) => {
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
    });

    test('shows, edits and persists properties through XML import', async ({page}) => {
        const editedId = await editStartEventProperties(page);
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
        await expectStartEventXml(page, xml, id);
        await expectEventDefinitions(page, xml, id, ['messageEventDefinition']);
    }
});

test.describe('Timer start event — timeDate', () => {
    test.beforeEach(async ({page}) => {
        await createStartDiagram(page);
        await selectShape(page, ELEMENT_ID);
        await changeElement(page, 'Timer start event');
    });

    test('designs the element and exports its BPMN type and variant', async ({page}) => {
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
    });

    test('shows, edits and persists properties through XML import', async ({page}) => {
        const editedId = await editStartEventProperties(page);
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
        await expectStartEventXml(page, xml, id);
        await expectEventDefinitions(page, xml, id, ['timerEventDefinition']);
    }
});

test.describe('Timer start event — timeDuration', () => {
    test.beforeEach(async ({page}) => {
        await createStartDiagram(page);
        await selectShape(page, ELEMENT_ID);
        await changeElement(page, 'Timer start event');
    });

    test('designs the element and exports its BPMN type and variant', async ({page}) => {
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
    });

    test('shows, edits and persists properties through XML import', async ({page}) => {
        const editedId = await editStartEventProperties(page);
        await editTimer(page, 'timeDuration', 'PT1H');
        await expectPropertyGroups(page, [...PROPERTY_GROUPS, 'timer']);
        const xml = await expectPropertiesRoundTrip(page, () => selectShape(page, editedId));
        expectMetadataXml(xml);
        await expectDesign(page, xml, editedId);
    });

    test('rejects a duration start timer with a validation error', async ({page}) => {
        await editTimer(page, 'timeDuration', 'PT1H');
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
        const response = await deployProcess(page);
        const error = await response.json() as { message: string };
        expect(error.message).toContain('missing processInstanceKey for timer start event with duration');
        test.fail(true, 'missing processInstanceKey for timer start event with duration');
        expect(response.status()).toBe(400);
    });

    async function expectDesign(page: Page, xml: string, id: string): Promise<void> {
        await expectStartEventXml(page, xml, id);
        await expectEventDefinitions(page, xml, id, ['timerEventDefinition']);
    }
});

test.describe('Timer start event — timeCycle', () => {
    test.beforeEach(async ({page}) => {
        await createStartDiagram(page);
        await selectShape(page, ELEMENT_ID);
        await changeElement(page, 'Timer start event');
    });

    test('designs the element and exports its BPMN type and variant', async ({page}) => {
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
    });

    test('shows, edits and persists properties through XML import', async ({page}) => {
        const editedId = await editStartEventProperties(page);
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
        await expectStartEventXml(page, xml, id);
        await expectEventDefinitions(page, xml, id, ['timerEventDefinition']);
    }
});

test.describe('Conditional start event', () => {
    test.beforeEach(async ({page}) => {
        await createStartDiagram(page);
        await selectShape(page, ELEMENT_ID);
        await changeElement(page, 'Conditional start event');
    });

    test('designs the element and exports its BPMN type and variant', async ({page}) => {
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
    });

    test('shows, edits and persists properties through XML import', async ({page}) => {
        const editedId = await editStartEventProperties(page);
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
        await expectStartEventXml(page, xml, id);
        await expectEventDefinitions(page, xml, id, ['conditionalEventDefinition']);
    }
});

test.describe('Signal start event', () => {
    test.beforeEach(async ({page}) => {
        await createStartDiagram(page);
        await selectShape(page, ELEMENT_ID);
        await changeElement(page, 'Signal start event');
    });

    test('designs the element and exports its BPMN type and variant', async ({page}) => {
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
    });

    test('shows, edits and persists properties through XML import', async ({page}) => {
        const editedId = await editStartEventProperties(page);
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
        await expectStartEventXml(page, xml, id);
        await expectEventDefinitions(page, xml, id, ['signalEventDefinition']);
    }
});

test.describe('Start event with an execution listener', () => {
    test.beforeEach(async ({page}) => {
        await createStartDiagram(page);
        await selectShape(page, ELEMENT_ID);
    });

    test('designs the element and exports its end listener', async ({page}) => {
        await editListener(page, ELEMENT_ID, 'order-started', '3');
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
        await expectListenerXml(page, xml, ELEMENT_ID, {type: 'order-started', retries: '3'});
    });

    test('shows, edits and persists properties through XML import', async ({page}) => {
        const editedId = await editStartEventProperties(page);
        await editListener(page, editedId, 'order-started', '3');
        await expectPropertyGroups(page, PROPERTY_GROUPS);
        const xml = await expectPropertiesRoundTrip(page, () => selectShape(page, editedId));
        expectMetadataXml(xml);
        await expectDesign(page, xml, editedId);
        await expectListenerXml(page, xml, editedId, {type: 'order-started', retries: '3'});
    });

    test('keeps the listener and its retries while its type is cleared', async ({page}) => {
        await editListener(page, ELEMENT_ID, 'order-started', '3');
        await fillEntry(page, listenerEntry(ELEMENT_ID, 'type'), '');
        await expect(entry(page, listenerEntry(ELEMENT_ID, 'type')).locator('.bio-properties-panel-error')).toContainText('Enter the job type');
        await expect(entry(page, listenerEntry(ELEMENT_ID, 'retries')).getByRole('textbox')).toHaveValue('3');
        const xml = await downloadBpmnXml(page);
        await expectXmlElements(page, xml, `[id="${ELEMENT_ID}"] executionListeners > executionListener`, [{
            name: 'executionListener',
            attributes: {eventType: 'end', retries: '3'},
        }]);
    });

    test('removes the listener with its delete button', async ({page}) => {
        await editListener(page, ELEMENT_ID, 'order-started', '3');
        const group = await openGroup(page, LISTENER_GROUP);
        await group.locator('.bio-properties-panel-collapsible-entry-header').hover();
        await group.getByTitle('Delete item').click();
        await expect(entry(page, listenerEntry(ELEMENT_ID, 'type'))).toHaveCount(0);
        await expect(group.getByTitle('Create new list item')).toBeVisible();
        const xml = await downloadBpmnXml(page);
        await expectXmlElements(page, xml, `[id="${ELEMENT_ID}"] executionListeners`, []);
    });

    test('deploys the designed process and reads back its BPMN XML', async ({page}) => {
        await editListener(page, ELEMENT_ID, 'order-started', '3');
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
        const response = await deployProcess(page);
        await expectDeploymentSaved(page, response, xml);
    });

    test('flags a FEEL type, which the engine refuses at deployment', async ({page}) => {
        await editListener(page, ELEMENT_ID, '=jobType');
        await expect(entry(page, listenerEntry(ELEMENT_ID, 'type')).locator('.bio-properties-panel-error')).toContainText('literal');
        const response = await deployProcess(page);
        await expectDeploymentRejected(page, response, "a listener's type must be a literal");
    });

    async function expectDesign(page: Page, xml: string, id: string): Promise<void> {
        await expectStartEventXml(page, xml, id);
        await expectEventDefinitions(page, xml, id, []);
    }
});

// Creates the start event's first listener unless it has one, then enters its
// fields. A start event takes end listeners only, so the panel offers no other
// event type there.
async function editListener(page: Page, id: string, type: string, retries?: string): Promise<void> {
    const group = await openGroup(page, LISTENER_GROUP);
    if (await entry(page, listenerEntry(id, 'type')).count() === 0) {
        await group.getByTitle('Create new list item').click();
    }
    await expect(entry(page, listenerEntry(id, 'eventType')).getByRole('combobox')).toHaveValue('end');
    await fillEntry(page, listenerEntry(id, 'type'), type);
    if (retries !== undefined) await fillEntry(page, listenerEntry(id, 'retries'), retries);
}

async function expectListenerXml(page: Page, xml: string, id: string, expected: {type: string; retries: string}): Promise<void> {
    await expectXmlElements(page, xml, `[id="${id}"] executionListeners > executionListener`, [{
        name: 'executionListener',
        attributes: {eventType: 'end', type: expected.type, retries: expected.retries},
    }]);
}

async function createStartDiagram(page: Page): Promise<void> {
    await createProcess(page);
    await appendElement(page, 'Start', 'Append end event', 'End');
    await selectShape(page, 'Start');
    await renameSelectedElement(page, ELEMENT_ID);
}

async function editStartEventProperties(page: Page): Promise<string> {
    await openGroup(page, 'general');
    await fillEntry(page, 'name', 'start event edited');
    const editedId = `${ELEMENT_ID}_edited`;
    await editMetadata(page, editedId);
    await editOutputMappings(page, editedId);
    await editExtensionProperties(page, editedId);
    await editExampleData(page);
    return editedId;
}

async function expectStartEventXml(page: Page, xml: string, id: string): Promise<void> {
    await expectValidBpmnXml(page, xml);
    await expectXmlElements(page, xml, `[id="${id}"]`, [{name: 'startEvent'}]);
    await expectXmlElements(page, xml, `BPMNShape[bpmnElement="${id}"]`, [{name: 'BPMNShape'}]);
}
