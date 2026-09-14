import {expect, test, type Page} from '@playwright/test';

import {
    appendTaskToNewProcess,
    selectShape,
    changeElement,
    toggleMarker,
    downloadBpmnXml,
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
    'zenbpm-implementation',
];

test.describe('Business rule task — dmnDecision / latest', () => {
    test.beforeEach(async ({page}) => {
        await appendTaskToNewProcess(page, ELEMENT_ID);
        await changeElement(page, 'Business rule task');
    });

    test('designs the element and exports its BPMN type and variant', async ({page}) => {
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
    });

    test('shows, edits and persists properties through XML import', async ({page}) => {
        const editedId = await editBusinessRuleTaskProperties(page);
        await configureDmnDecision(page);
        await expectPropertyGroups(page, [...PROPERTY_GROUPS, 'zenbpm-calledDecision']);
        const xml = await expectPropertiesRoundTrip(page, () => selectShape(page, editedId));
        expectMetadataXml(xml);
        await expectDesign(page, xml, editedId);
    });

    test('deploys the designed process and reads back its BPMN XML', async ({page}) => {
        await configureDmnDecision(page);
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
        const response = await deployProcess(page);
        await expectDeploymentSaved(page, response, xml);
    });

    async function expectDesign(page: Page, xml: string, id: string): Promise<void> {
        await expectBusinessRuleTaskXml(page, xml, id);
        await expectXmlElements(page, xml, `[id="${id}"] > :is(multiInstanceLoopCharacteristics, standardLoopCharacteristics)`, []);
    }
});

test.describe('Business rule task — dmnDecision / versionTag', () => {
    test.beforeEach(async ({page}) => {
        await appendTaskToNewProcess(page, ELEMENT_ID);
        await changeElement(page, 'Business rule task');
    });

    test('designs the element and exports its BPMN type and variant', async ({page}) => {
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
    });

    test('shows, edits and persists properties through XML import', async ({page}) => {
        const editedId = await editBusinessRuleTaskProperties(page);
        await configureDmnDecision(page);
        await selectVersionTag(page);
        await expectPropertyGroups(page, [...PROPERTY_GROUPS, 'zenbpm-calledDecision']);
        const xml = await expectPropertiesRoundTrip(page, () => selectShape(page, editedId));
        expectMetadataXml(xml);
        await expectDesign(page, xml, editedId);
    });

    test('deploys the designed process and reads back its BPMN XML', async ({page}) => {
        await configureDmnDecision(page);
        await selectVersionTag(page);
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
        const response = await deployProcess(page);
        await expectDeploymentSaved(page, response, xml);
    });

    async function expectDesign(page: Page, xml: string, id: string): Promise<void> {
        await expectBusinessRuleTaskXml(page, xml, id);
        await expectXmlElements(page, xml, `[id="${id}"] > :is(multiInstanceLoopCharacteristics, standardLoopCharacteristics)`, []);
    }
});

test.describe('Business rule task — jobWorker / latest', () => {
    test.beforeEach(async ({page}) => {
        await appendTaskToNewProcess(page, ELEMENT_ID);
        await changeElement(page, 'Business rule task');
    });

    test('designs the element and exports its BPMN type and variant', async ({page}) => {
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
    });

    test('shows, edits and persists properties through XML import', async ({page}) => {
        const editedId = await editBusinessRuleTaskProperties(page);
        await configureJobWorker(page);
        await expectPropertyGroups(page, [...PROPERTY_GROUPS, 'zenbpm-taskDefinition']);
        const xml = await expectPropertiesRoundTrip(page, () => selectShape(page, editedId));
        expectMetadataXml(xml);
        await expectDesign(page, xml, editedId);
    });

    test('deploys the designed process and reads back its BPMN XML', async ({page}) => {
        await configureJobWorker(page);
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
        const response = await deployProcess(page);
        await expectDeploymentSaved(page, response, xml);
    });

    async function expectDesign(page: Page, xml: string, id: string): Promise<void> {
        await expectBusinessRuleTaskXml(page, xml, id);
        await expectXmlElements(page, xml, `[id="${id}"] > :is(multiInstanceLoopCharacteristics, standardLoopCharacteristics)`, []);
    }
});

test.describe('Business rule task — dmnDecision / latest — parallel loop', () => {
    test.beforeEach(async ({page}) => {
        await appendTaskToNewProcess(page, ELEMENT_ID);
        await changeElement(page, 'Business rule task');
        await toggleMarker(page, 'Parallel multi-instance');
    });

    test('designs the element and exports its BPMN type and variant', async ({page}) => {
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
    });

    test('shows, edits and persists properties through XML import', async ({page}) => {
        const editedId = await editBusinessRuleTaskProperties(page);
        await configureDmnDecision(page);
        await editMultiInstance(page);
        await expectPropertyGroups(page, [...PROPERTY_GROUPS, 'zenbpm-calledDecision', 'multiInstance']);
        const xml = await expectPropertiesRoundTrip(page, () => selectShape(page, editedId));
        expectMetadataXml(xml);
        await expectDesign(page, xml, editedId);
    });

    test('deploys the designed process and reads back its BPMN XML', async ({page}) => {
        await configureDmnDecision(page);
        await editMultiInstance(page);
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
        const response = await deployProcess(page);
        await expectDeploymentSaved(page, response, xml);
    });

    async function expectDesign(page: Page, xml: string, id: string): Promise<void> {
        await expectBusinessRuleTaskXml(page, xml, id);
        await expectXmlElements(page, xml, `[id="${id}"] > :is(multiInstanceLoopCharacteristics, standardLoopCharacteristics)`, [{name: 'multiInstanceLoopCharacteristics'}]);
        await expectXmlElements(page, xml, `[id="${id}"] > multiInstanceLoopCharacteristics[isSequential="true"]`, []);
    }
});

test.describe('Business rule task — dmnDecision / latest — sequential loop', () => {
    test.beforeEach(async ({page}) => {
        await appendTaskToNewProcess(page, ELEMENT_ID);
        await changeElement(page, 'Business rule task');
        await toggleMarker(page, 'Sequential multi-instance');
    });

    test('designs the element and exports its BPMN type and variant', async ({page}) => {
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
    });

    test('shows, edits and persists properties through XML import', async ({page}) => {
        const editedId = await editBusinessRuleTaskProperties(page);
        await configureDmnDecision(page);
        await editMultiInstance(page);
        await expectPropertyGroups(page, [...PROPERTY_GROUPS, 'zenbpm-calledDecision', 'multiInstance']);
        const xml = await expectPropertiesRoundTrip(page, () => selectShape(page, editedId));
        expectMetadataXml(xml);
        await expectDesign(page, xml, editedId);
    });

    test('deploys the designed process and reads back its BPMN XML', async ({page}) => {
        await configureDmnDecision(page);
        await editMultiInstance(page);
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
        const response = await deployProcess(page);
        await expectDeploymentSaved(page, response, xml);
    });

    async function expectDesign(page: Page, xml: string, id: string): Promise<void> {
        await expectBusinessRuleTaskXml(page, xml, id);
        await expectXmlElements(page, xml, `[id="${id}"] > :is(multiInstanceLoopCharacteristics, standardLoopCharacteristics)`, [{name: 'multiInstanceLoopCharacteristics'}]);
        await expectXmlElements(page, xml, `[id="${id}"] > multiInstanceLoopCharacteristics`, [{attributes: {isSequential: 'true'}}]);
    }
});

test.describe('Business rule task — dmnDecision / latest — standard loop', () => {
    test.beforeEach(async ({page}) => {
        await appendTaskToNewProcess(page, ELEMENT_ID);
        await changeElement(page, 'Business rule task');
        await toggleMarker(page, 'Loop');
    });

    test('designs the element and exports its BPMN type and variant', async ({page}) => {
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
    });

    test('shows, edits and persists properties through XML import', async ({page}) => {
        const editedId = await editBusinessRuleTaskProperties(page);
        await configureDmnDecision(page);
        await expectPropertyGroups(page, [...PROPERTY_GROUPS, 'zenbpm-calledDecision']);
        const xml = await expectPropertiesRoundTrip(page, () => selectShape(page, editedId));
        expectMetadataXml(xml);
        await expectDesign(page, xml, editedId);
    });

    test('deploys the designed process and reads back its BPMN XML', async ({page}) => {
        await configureDmnDecision(page);
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
        const response = await deployProcess(page);
        await expectDeploymentSaved(page, response, xml);
    });

    async function expectDesign(page: Page, xml: string, id: string): Promise<void> {
        await expectBusinessRuleTaskXml(page, xml, id);
        await expectXmlElements(page, xml, `[id="${id}"] > :is(multiInstanceLoopCharacteristics, standardLoopCharacteristics)`, [{name: 'standardLoopCharacteristics'}]);
    }
});

test('switches implementation and removes incompatible DMN and worker settings', async ({page}) => {
    await appendTaskToNewProcess(page, ELEMENT_ID);
    await changeElement(page, 'Business rule task');
    await configureDmnDecision(page);
    await openGroup(page, 'zenbpm-implementation');
    const implementation = entry(page, 'zenbpm-implementation-type').getByRole('combobox');
    await implementation.selectOption('jobWorker');
    await expect(page.locator('[data-group-id="group-zenbpm-calledDecision"]')).toHaveCount(0);
    await openGroup(page, 'zenbpm-taskDefinition');
    await fillEntry(page, 'zenbpm-taskDef-type', 'decision-worker');
    await fillEntry(page, 'zenbpm-taskDef-retries', '5');
    let xml = await downloadBpmnXml(page);
    expect(xml).not.toContain('<zenbpm:calledDecision');
    expect(xml).toContain('type="decision-worker"');

    await implementation.selectOption('dmnDecision');
    await expect(page.locator('[data-group-id="group-zenbpm-taskDefinition"]')).toHaveCount(0);
    await openGroup(page, 'zenbpm-calledDecision');
    await expect(entry(page, 'zenbpm-calledDecision-decisionId').getByRole('textbox')).toHaveValue('');
    await fillEntry(page, 'zenbpm-calledDecision-decisionId', 'replacement-decision');
    xml = await downloadBpmnXml(page);
    expect(xml).not.toContain('<zenbpm:taskDefinition');
    expect(xml).toContain('decisionId="replacement-decision"');
});

async function configureDmnDecision(page: Page): Promise<void> {
    await openGroup(page, 'zenbpm-implementation');
    const implementation = entry(page, 'zenbpm-implementation-type').getByRole('combobox');
    await expect(implementation.locator('option')).toHaveText(['DMN decision', 'Job worker']);
    await implementation.selectOption('dmnDecision');
    await openGroup(page, 'zenbpm-calledDecision');
    await fillEntry(page, 'zenbpm-calledDecision-decisionId', 'e2e-decision');
    const binding = entry(page, 'zenbpm-calledDecision-bindingType').getByRole('combobox');
    await expect(binding).toHaveValue('latest');
    await expect(binding.locator('option')).toHaveText(['Latest', 'Version tag']);
    await binding.selectOption('versionTag');
    await fillEntry(page, 'zenbpm-calledDecision-versionTag', 'release-1');
    await binding.selectOption('latest');
    await expect(entry(page, 'zenbpm-calledDecision-versionTag')).toHaveCount(0);
    await fillEntry(page, 'zenbpm-calledDecision-resultVariable', 'decisionResult');
}

async function selectVersionTag(page: Page): Promise<void> {
    await openGroup(page, 'zenbpm-calledDecision');
    await entry(page, 'zenbpm-calledDecision-bindingType').getByRole('combobox').selectOption('versionTag');
    await expect(entry(page, 'zenbpm-calledDecision-versionTag').getByRole('textbox')).toHaveValue('release-1');
}

async function configureJobWorker(page: Page): Promise<void> {
    await openGroup(page, 'zenbpm-implementation');
    const implementation = entry(page, 'zenbpm-implementation-type').getByRole('combobox');
    await expect(implementation.locator('option')).toHaveText(['DMN decision', 'Job worker']);
    await implementation.selectOption('jobWorker');
    await openGroup(page, 'zenbpm-taskDefinition');
    await fillEntry(page, 'zenbpm-taskDef-type', 'e2e-worker');
    await fillEntry(page, 'zenbpm-taskDef-retries', '3');
}

async function editBusinessRuleTaskProperties(page: Page): Promise<string> {
    await openGroup(page, 'general');
    await fillEntry(page, 'name', 'business rule task edited');
    const editedId = `${ELEMENT_ID}_edited`;
    await editMetadata(page, editedId);
    await editInputMappings(page, editedId);
    await editOutputMappings(page, editedId);
    await editExtensionProperties(page, editedId);
    await editExampleData(page);
    return editedId;
}

async function expectBusinessRuleTaskXml(page: Page, xml: string, id: string): Promise<void> {
    await expectValidBpmnXml(page, xml);
    await expectXmlElements(page, xml, `[id="${id}"]`, [{name: 'businessRuleTask'}]);
    await expectXmlElements(page, xml, `BPMNShape[bpmnElement="${id}"]`, [{name: 'BPMNShape'}]);
}
