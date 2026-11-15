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
import {
    EXECUTION_LISTENER_GROUP,
    addListener,
    expectListenersXml,
    listenerEntry,
    type DesignedListener,
} from '../../helpers/executionListeners';

const ELEMENT_ID = 'Element_under_test';
// Every start event of this spec sits directly under the process, where the
// engine runs its end execution listeners, so each offers the group.
const PROPERTY_GROUPS = [
    ...COMMON_PROPERTY_GROUPS,
    'zenbpm-ioMapping-outputs',
    EXECUTION_LISTENER_GROUP,
];
// A start event takes end listeners only, so the panel offers no other event type there.
const LISTENER: DesignedListener = {eventType: 'end', type: 'order-started', retries: '3'};

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
        await addListener(page, ELEMENT_ID, LISTENER);
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
        await expectListenersXml(page, xml, ELEMENT_ID, [LISTENER]);
    });

    test('shows, edits and persists properties through XML import', async ({page}) => {
        const editedId = await editStartEventProperties(page);
        await addListener(page, editedId, LISTENER);
        await expectPropertyGroups(page, PROPERTY_GROUPS);
        const xml = await expectPropertiesRoundTrip(page, () => selectShape(page, editedId));
        expectMetadataXml(xml);
        await expectDesign(page, xml, editedId);
        await expectListenersXml(page, xml, editedId, [LISTENER]);
    });

    test('keeps the listener and its retries while its type is cleared', async ({page}) => {
        await addListener(page, ELEMENT_ID, LISTENER);
        await fillEntry(page, listenerEntry(ELEMENT_ID, 0, 'type'), '');
        await expect(entry(page, listenerEntry(ELEMENT_ID, 0, 'type')).locator('.bio-properties-panel-error')).toContainText('Enter the job type');
        await expect(entry(page, listenerEntry(ELEMENT_ID, 0, 'retries')).getByRole('textbox')).toHaveValue('3');
        const xml = await downloadBpmnXml(page);
        await expectXmlElements(page, xml, `[id="${ELEMENT_ID}"] executionListeners > executionListener`, [{
            name: 'executionListener',
            attributes: {eventType: 'end', retries: '3'},
        }]);
    });

    test('removes the listener with its delete button', async ({page}) => {
        await addListener(page, ELEMENT_ID, LISTENER);
        const group = await openGroup(page, EXECUTION_LISTENER_GROUP);
        await group.locator('.bio-properties-panel-collapsible-entry-header').hover();
        await group.getByTitle('Delete item').click();
        await expect(entry(page, listenerEntry(ELEMENT_ID, 0, 'type'))).toHaveCount(0);
        await expect(group.getByTitle('Create new list item')).toBeVisible();
        const xml = await downloadBpmnXml(page);
        await expectXmlElements(page, xml, `[id="${ELEMENT_ID}"] executionListeners`, []);
    });

    test('deploys the designed process and reads back its BPMN XML', async ({page}) => {
        await addListener(page, ELEMENT_ID, LISTENER);
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
        const response = await deployProcess(page);
        await expectDeploymentSaved(page, response, xml);
    });

    test('flags a FEEL type, which the engine refuses at deployment', async ({page}) => {
        await addListener(page, ELEMENT_ID, {eventType: 'end', type: '=jobType'});
        await expect(entry(page, listenerEntry(ELEMENT_ID, 0, 'type')).locator('.bio-properties-panel-error')).toContainText('literal');
        const response = await deployProcess(page);
        await expectDeploymentRejected(page, response, "a listener's type must be a literal");
    });

    async function expectDesign(page: Page, xml: string, id: string): Promise<void> {
        await expectStartEventXml(page, xml, id);
        await expectEventDefinitions(page, xml, id, []);
    }
});

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
