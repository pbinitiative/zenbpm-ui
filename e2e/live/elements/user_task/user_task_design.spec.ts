import {expect, test, type Page} from '@playwright/test';

import {
    appendTaskToNewProcess,
    selectShape,
    changeElement,
    toggleMarker,
    downloadBpmnXml,
    importBpmnXml,
    expectPropertiesRoundTrip,
} from '../../helpers/processDesigner';
import {openGroup, entry, fillEntry, expectPropertyGroups} from '../../helpers/propertiesPanel';
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
import {deployProcess, expectDeploymentSaved} from '../../helpers/processDeployment';

const ELEMENT_ID = 'Element_under_test';
const PROPERTY_GROUPS = [
    ...COMMON_PROPERTY_GROUPS,
    'zenbpm-ioMapping-inputs',
    'zenbpm-ioMapping-outputs',
    'zenbpm-taskDefinition',
    'zenbpm-assignmentDefinition',
    'zenbpm-form',
];

test.describe('User task', () => {
    test.beforeEach(async ({page}) => {
        await appendTaskToNewProcess(page, ELEMENT_ID);
        await changeElement(page, 'User task');
    });

    test('designs the element and exports its BPMN type and variant', async ({page}) => {
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
    });

    test('shows, edits and persists properties through XML import', async ({page}) => {
        const editedId = await editUserTaskProperties(page);
        await configureUserTask(page);
        await expectPropertyGroups(page, PROPERTY_GROUPS);
        const xml = await expectPropertiesRoundTrip(page, () => selectShape(page, editedId));
        expectMetadataXml(xml);
        await expectDesign(page, xml, editedId);
    });

    test('deploys the designed process and reads back its BPMN XML', async ({page}) => {
        await configureUserTask(page);
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
        const response = await deployProcess(page);
        await expectDeploymentSaved(page, response, xml);
    });

    async function expectDesign(page: Page, xml: string, id: string): Promise<void> {
        await expectUserTaskXml(page, xml, id);
        await expectXmlElements(page, xml, `[id="${id}"] > :is(multiInstanceLoopCharacteristics, standardLoopCharacteristics)`, []);
    }
});

test.describe('User task — parallel loop', () => {
    test.beforeEach(async ({page}) => {
        await appendTaskToNewProcess(page, ELEMENT_ID);
        await changeElement(page, 'User task');
        await toggleMarker(page, 'Parallel multi-instance');
    });

    test('designs the element and exports its BPMN type and variant', async ({page}) => {
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
    });

    test('shows, edits and persists properties through XML import', async ({page}) => {
        const editedId = await editUserTaskProperties(page);
        await configureUserTask(page);
        await editMultiInstance(page);
        await expectPropertyGroups(page, [...PROPERTY_GROUPS, 'multiInstance']);
        const xml = await expectPropertiesRoundTrip(page, () => selectShape(page, editedId));
        expectMetadataXml(xml);
        await expectDesign(page, xml, editedId);
    });

    test('deploys the designed process and reads back its BPMN XML', async ({page}) => {
        await configureUserTask(page);
        await editMultiInstance(page);
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
        const response = await deployProcess(page);
        await expectDeploymentSaved(page, response, xml);
    });

    async function expectDesign(page: Page, xml: string, id: string): Promise<void> {
        await expectUserTaskXml(page, xml, id);
        await expectXmlElements(page, xml, `[id="${id}"] > :is(multiInstanceLoopCharacteristics, standardLoopCharacteristics)`, [{name: 'multiInstanceLoopCharacteristics'}]);
        await expectXmlElements(page, xml, `[id="${id}"] > multiInstanceLoopCharacteristics[isSequential="true"]`, []);
    }
});

test.describe('User task — sequential loop', () => {
    test.beforeEach(async ({page}) => {
        await appendTaskToNewProcess(page, ELEMENT_ID);
        await changeElement(page, 'User task');
        await toggleMarker(page, 'Sequential multi-instance');
    });

    test('designs the element and exports its BPMN type and variant', async ({page}) => {
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
    });

    test('shows, edits and persists properties through XML import', async ({page}) => {
        const editedId = await editUserTaskProperties(page);
        await configureUserTask(page);
        await editMultiInstance(page);
        await expectPropertyGroups(page, [...PROPERTY_GROUPS, 'multiInstance']);
        const xml = await expectPropertiesRoundTrip(page, () => selectShape(page, editedId));
        expectMetadataXml(xml);
        await expectDesign(page, xml, editedId);
    });

    test('deploys the designed process and reads back its BPMN XML', async ({page}) => {
        await configureUserTask(page);
        await editMultiInstance(page);
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
        const response = await deployProcess(page);
        await expectDeploymentSaved(page, response, xml);
    });

    async function expectDesign(page: Page, xml: string, id: string): Promise<void> {
        await expectUserTaskXml(page, xml, id);
        await expectXmlElements(page, xml, `[id="${id}"] > :is(multiInstanceLoopCharacteristics, standardLoopCharacteristics)`, [{name: 'multiInstanceLoopCharacteristics'}]);
        await expectXmlElements(page, xml, `[id="${id}"] > multiInstanceLoopCharacteristics`, [{attributes: {isSequential: 'true'}}]);
    }
});

test.describe('User task — standard loop', () => {
    test.beforeEach(async ({page}) => {
        await appendTaskToNewProcess(page, ELEMENT_ID);
        await changeElement(page, 'User task');
        await toggleMarker(page, 'Loop');
    });

    test('designs the element and exports its BPMN type and variant', async ({page}) => {
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
    });

    test('shows, edits and persists properties through XML import', async ({page}) => {
        const editedId = await editUserTaskProperties(page);
        await configureUserTask(page);
        await expectPropertyGroups(page, PROPERTY_GROUPS);
        const xml = await expectPropertiesRoundTrip(page, () => selectShape(page, editedId));
        expectMetadataXml(xml);
        await expectDesign(page, xml, editedId);
    });

    test('deploys the designed process and reads back its BPMN XML', async ({page}) => {
        await configureUserTask(page);
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
        const response = await deployProcess(page);
        await expectDeploymentSaved(page, response, xml);
    });

    async function expectDesign(page: Page, xml: string, id: string): Promise<void> {
        await expectUserTaskXml(page, xml, id);
        await expectXmlElements(page, xml, `[id="${id}"] > :is(multiInstanceLoopCharacteristics, standardLoopCharacteristics)`, [{name: 'standardLoopCharacteristics'}]);
    }
});

test('validates, designs and persists a Zen Form on the user task', async ({page}) => {
    const elementId = ELEMENT_ID;
    await appendTaskToNewProcess(page, elementId);
    await changeElement(page, 'User task');
    const form = {
        type: 'default', id: 'ApprovalForm', schemaVersion: 19,
        components: [{type: 'textfield', id: 'Customer', key: 'customerName', label: 'Customer name'}],
    };
    await openGroup(page, 'zenbpm-form');
    await page.getByRole('button', {name: 'Design Form', exact: true}).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Zen Form Designer')).toBeVisible();
    await dialog.getByRole('button', {name: 'JSON', exact: true}).click();
    const editor = dialog.getByRole('textbox', {name: 'Editor content', exact: true});
    // Monaco chooses its shortcuts from the browser platform; Desktop Chrome
    // emulates Windows even when this test runs on a macOS host.
    const selectAll = await page.evaluate(() => /Macintosh|Mac OS X/.test(navigator.userAgent) ? 'Meta+A' : 'Control+A');
    await dialog.locator('.monaco-editor').click();
    await expect(editor).toBeFocused();
    await page.keyboard.press(selectAll);
    await page.keyboard.press('Backspace');
    await page.keyboard.type('{"components":');
    await expect(dialog.getByRole('button', {name: 'Submit', exact: true})).toBeDisabled();
    await dialog.locator('.monaco-editor').click();
    await expect(editor).toBeFocused();
    await page.keyboard.press(selectAll);
    await page.keyboard.press('Backspace');
    await page.keyboard.type(JSON.stringify(form));
    await expect(dialog.getByRole('button', {name: 'Submit', exact: true})).toBeEnabled();
    await dialog.getByRole('button', {name: 'Designer', exact: true}).click();
    await expect(dialog.getByText('Customer name', {exact: true})).toBeVisible();
    await dialog.getByRole('button', {name: 'Submit', exact: true}).click();
    await expect(dialog).toHaveCount(0);

    const xml = await downloadBpmnXml(page);
    const source = await page.evaluate(({xml, elementId}) => {
        const doc = new DOMParser().parseFromString(xml, 'application/xml');
        return doc.getElementById(elementId)?.querySelector('input[target="ZEN_FORM"]')?.getAttribute('source');
    }, {xml, elementId});
    expect(source).toBeTruthy();
    const savedForm = JSON.parse(JSON.parse(source!.slice(1)) as string) as typeof form;
    expect(savedForm.components).toMatchObject(form.components);
    expect(savedForm.components).toHaveLength(1);
    await importBpmnXml(page, xml);
    await selectShape(page, elementId);
    await openGroup(page, 'zenbpm-form');
    await page.getByRole('button', {name: 'Design Form', exact: true}).click();
    await expect(dialog.getByText('Customer name', {exact: true})).toBeVisible();
    await dialog.getByRole('button', {name: 'Cancel', exact: true}).click();
    expect(await downloadBpmnXml(page)).toBe(xml);
});

async function configureUserTask(page: Page): Promise<void> {
    await openGroup(page, 'zenbpm-taskDefinition');
    await fillEntry(page, 'zenbpm-taskDef-type', 'e2e-worker');
    await expect(entry(page, 'zenbpm-taskDef-retries')).toHaveCount(0);
    await openGroup(page, 'zenbpm-assignmentDefinition');
    for (const [field, value] of Object.entries({
        assignee: '"tester"',
        candidateGroups: '["reviewers"]',
        candidateUsers: '["tester"]',
        dueDate: '"2030-01-01T12:00:00Z"',
        followUpDate: '"2030-01-01T10:00:00Z"',
        priority: '50'
    })) {
        await fillEntry(page, `zenbpm-assign-${field}`, value);
    }
    await entry(page, 'zenbpm-assign-priority').getByTitle('Click to set a dynamic value with FEEL expression', {exact: true}).click();
    await expect.poll(() => page.evaluate(() => localStorage.getItem('process-designer-unsaved-changes'))).toContain('priority="=50"');
    const priority = entry(page, 'zenbpm-assign-priority').getByRole('textbox');
    await expect(priority).toHaveText('50');
    // CodeMirror chooses shortcuts from navigator.platform, independently of the emulated user agent.
    const selectAll = await page.evaluate(() => /Mac/.test(navigator.platform) ? 'Meta+A' : 'Control+A');
    await priority.click();
    await priority.press(selectAll);
    await priority.pressSequentially('25 + 25');
    await priority.press('Tab');
    await expect(priority).toHaveText('25 + 25');
    await expect.poll(() => page.evaluate(() => localStorage.getItem('process-designer-unsaved-changes')))
        .toContain('priority="=25 + 25"');
}

async function editUserTaskProperties(page: Page): Promise<string> {
    await openGroup(page, 'general');
    await fillEntry(page, 'name', 'user task edited');
    const editedId = `${ELEMENT_ID}_edited`;
    await editMetadata(page, editedId);
    await editInputMappings(page, editedId);
    await editOutputMappings(page, editedId);
    await editExtensionProperties(page, editedId);
    await editExampleData(page);
    return editedId;
}

async function expectUserTaskXml(page: Page, xml: string, id: string): Promise<void> {
    await expectValidBpmnXml(page, xml);
    await expectXmlElements(page, xml, `[id="${id}"]`, [{name: 'userTask'}]);
    await expectXmlElements(page, xml, `BPMNShape[bpmnElement="${id}"]`, [{name: 'BPMNShape'}]);
}
