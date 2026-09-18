import {test, type Page} from '@playwright/test';

import {
    changeElement,
    toggleMenuItem,
    downloadBpmnXml,
    expectPropertiesRoundTrip,
    createProcess,
    appendElement,
    createFromPalette,
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
} from '../../helpers/commonProperties';
import {expectXmlElements, expectValidBpmnXml} from '../../helpers/bpmnAssertions';
import {deployProcess, expectDeploymentSaved} from '../../helpers/processDeployment';

const ELEMENT_ID = 'Element_under_test';
const PROPERTY_GROUPS = COMMON_PROPERTY_GROUPS;

test.describe('Participant', () => {
    test.beforeEach(async ({page}) => {
        await createParticipantDiagram(page);
        await selectContainer(page, ELEMENT_ID);
    });

    test('designs the element and exports its BPMN type and variant', async ({page}) => {
        const xml = await downloadBpmnXml(page);
        await expectParticipantXml(page, xml, ELEMENT_ID);
    });

    test('shows, edits and persists properties through XML import', async ({page}) => {
        const editedId = await editParticipantProperties(page);
        await editPoolProcessProperties(page, editedId);
        await expectPropertyGroups(page, PROPERTY_GROUPS);
        const xml = await expectPropertiesRoundTrip(page, () => selectContainer(page, editedId));
        expectMetadataXml(xml);
        await expectParticipantXml(page, xml, editedId);
    });

    test('deploys the designed process and reads back its BPMN XML', async ({page}) => {
        const xml = await downloadBpmnXml(page);
        await expectParticipantXml(page, xml, ELEMENT_ID);
        const response = await deployProcess(page);
        await expectDeploymentSaved(page, response, xml);
    });
});

test.describe('Participant — multiplicity', () => {
    test.beforeEach(async ({page}) => {
        await createParticipantDiagram(page);
        await selectContainer(page, ELEMENT_ID);
        await toggleMenuItem(page, 'toggle-participant-multiplicity');
    });

    test('designs the element and exports its BPMN type and variant', async ({page}) => {
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
    });

    test('shows, edits and persists properties through XML import', async ({page}) => {
        const editedId = await editParticipantProperties(page);
        await editPoolProcessProperties(page, editedId);
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
        await expectParticipantXml(page, xml, id);
        await expectXmlElements(page, xml, `[id="${id}"] > participantMultiplicity`, [{}]);
    }
});

test.describe('Empty pool/participant', () => {
    test.beforeEach(async ({page}) => {
        await createEmptyParticipantDiagram(page);
        await selectContainer(page, ELEMENT_ID);
        await changeElement(page, 'Empty pool/participant');
    });

    test('designs the element and exports its BPMN type and variant', async ({page}) => {
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
    });

    test('shows, edits and persists properties through XML import', async ({page}) => {
        const editedId = await editParticipantProperties(page);
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
        await expectParticipantXml(page, xml, id);
        await expectXmlElements(page, xml, `[id="${id}"][processRef]`, []);
    }
});

async function createParticipantDiagram(page: Page): Promise<void> {
    await createProcess(page);
    await appendElement(page, 'Start', 'Append task', 'Host_task');
    await changeElement(page, 'User task');
    await appendElement(page, 'Host_task', 'Append end event', 'End');
    await createFromPalette(page, 'Create pool/participant', {x: 450, y: 220}, ELEMENT_ID);
}

async function createEmptyParticipantDiagram(page: Page): Promise<void> {
    await createProcess(page);
    await appendElement(page, 'Start', 'Append task', 'Host_task');
    await changeElement(page, 'User task');
    await appendElement(page, 'Host_task', 'Append end event', 'End');
    await createFromPalette(page, 'Create pool/participant', {x: 450, y: 220}, 'Participant');
    await createFromPalette(page, 'Create pool/participant', {x: 450, y: 530}, ELEMENT_ID);
}

async function editParticipantProperties(page: Page): Promise<string> {
    await openGroup(page, 'general');
    await fillEntry(page, 'name', 'participant edited');
    const editedId = `${ELEMENT_ID}_edited`;
    await editMetadata(page, editedId);
    await editExtensionProperties(page, editedId);
    await editExampleData(page);
    return editedId;
}

async function editPoolProcessProperties(page: Page, elementId: string): Promise<void> {
    await openGroup(page, 'documentation');
    await fillEntry(page, 'processDocumentation', 'Pool process documentation');
    await openGroup(page, 'general');
    await fillEntry(page, 'processName', 'Pool process edited');
    await fillEntry(page, 'processId', `${elementId}_process`);
    const executable = entry(page, 'isExecutable').getByRole('checkbox');
    await setCheckbox(executable, false);
    await setCheckbox(executable, true);
}

async function expectParticipantXml(page: Page, xml: string, id: string): Promise<void> {
    await expectValidBpmnXml(page, xml);
    await expectXmlElements(page, xml, `[id="${id}"]`, [{name: 'participant'}]);
    await expectXmlElements(page, xml, `BPMNShape[bpmnElement="${id}"]`, [{name: 'BPMNShape'}]);
}
