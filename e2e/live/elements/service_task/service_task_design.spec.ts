import { expect, test, type Page } from '@playwright/test';

import {
  appendTaskToNewProcess,
  selectShape,
  changeElement,
  toggleMarker,
  downloadBpmnXml,
  expectPropertiesRoundTrip,
} from '../../helpers/processDesigner';
import { openGroup, entry, fillEntry, expectPropertyGroups } from '../../helpers/propertiesPanel';
import {
  EXECUTION_LISTENER_GROUP,
  addListener,
  expectListenersXml,
  listenerEntry,
  type DesignedListener,
} from '../../helpers/executionListeners';
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
import { expectXmlElements, expectValidBpmnXml } from '../../helpers/bpmnAssertions';
import { deployProcess, expectDeploymentRejected, expectDeploymentSaved } from '../../helpers/processDeployment';

const ELEMENT_ID = 'Element_under_test';
// The groups of every variant. A service task which is no multi-instance
// activity runs execution listeners, so it offers their group as well.
const PROPERTY_GROUPS = [
  ...COMMON_PROPERTY_GROUPS,
  'zenbpm-ioMapping-inputs',
  'zenbpm-ioMapping-outputs',
  'zenbpm-taskDefinition',
];
// The engine runs the start listener before the task's own job and the end listener after it.
const LISTENERS: DesignedListener[] = [
  { eventType: 'start', type: 'reserve-stock', retries: '3' },
  { eventType: 'end', type: 'notify-customer' },
];

test.describe('Service task', () => {
  test.beforeEach(async ({ page }) => {
    await appendTaskToNewProcess(page, ELEMENT_ID);
    await changeElement(page, 'Service task');
  });

  test('designs the element and exports its BPMN type and variant', async ({ page }) => {
    const xml = await downloadBpmnXml(page);
    await expectDesign(page, xml, ELEMENT_ID);
  });

  test('shows, edits and persists properties through XML import', async ({ page }) => {
    const editedId = await editServiceTaskProperties(page);
    await configureServiceTask(page);
    await expectPropertyGroups(page, [...PROPERTY_GROUPS, EXECUTION_LISTENER_GROUP]);
    const xml = await expectPropertiesRoundTrip(page, () => selectShape(page, editedId));
    expectMetadataXml(xml);
    await expectDesign(page, xml, editedId);
  });

  test('deploys the designed process and reads back its BPMN XML', async ({ page }) => {
    await configureServiceTask(page);
    const xml = await downloadBpmnXml(page);
    await expectDesign(page, xml, ELEMENT_ID);
    const response = await deployProcess(page);
    await expectDeploymentSaved(page, response, xml);
  });

    async function expectDesign(page: Page, xml: string, id: string): Promise<void> {
        await expectServiceTaskXml(page, xml, id);
        await expectXmlElements(page, xml, `[id="${id}"] > :is(multiInstanceLoopCharacteristics, standardLoopCharacteristics)`, []);
    }
});

test.describe('Service task — parallel loop', () => {
  test.beforeEach(async ({ page }) => {
    await appendTaskToNewProcess(page, ELEMENT_ID);
    await changeElement(page, 'Service task');
    await toggleMarker(page, 'Parallel multi-instance');
  });

  test('designs the element and exports its BPMN type and variant', async ({ page }) => {
    const xml = await downloadBpmnXml(page);
    await expectDesign(page, xml, ELEMENT_ID);
  });

  test('shows, edits and persists properties through XML import', async ({ page }) => {
    const editedId = await editServiceTaskProperties(page);
    await configureServiceTask(page);
    await editMultiInstance(page);
    await expectPropertyGroups(page, [...PROPERTY_GROUPS, 'multiInstance']);
    const xml = await expectPropertiesRoundTrip(page, () => selectShape(page, editedId));
    expectMetadataXml(xml);
    await expectDesign(page, xml, editedId);
  });

  test('deploys the designed process and reads back its BPMN XML', async ({ page }) => {
    await configureServiceTask(page);
    await editMultiInstance(page, { completionCondition: false });
    const xml = await downloadBpmnXml(page);
    await expectDesign(page, xml, ELEMENT_ID);
    const response = await deployProcess(page);
    await expectDeploymentSaved(page, response, xml);
  });

  test('rejects deployment with a multi-instance completion condition', async ({ page }) => {
    await configureServiceTask(page);
    await editMultiInstance(page);
    const xml = await downloadBpmnXml(page);
    await expectDesign(page, xml, ELEMENT_ID);
    await expectCompletionConditionXml(page, xml, ELEMENT_ID);
    const response = await deployProcess(page);
    await expectDeploymentRejected(page, response, `serviceTask id="${ELEMENT_ID}" has a multi-instance completionCondition`);
  });

    async function expectDesign(page: Page, xml: string, id: string): Promise<void> {
        await expectServiceTaskXml(page, xml, id);
        await expectXmlElements(page, xml, `[id="${id}"] > :is(multiInstanceLoopCharacteristics, standardLoopCharacteristics)`, [{ name: 'multiInstanceLoopCharacteristics' }]);
        await expectXmlElements(page, xml, `[id="${id}"] > multiInstanceLoopCharacteristics[isSequential="true"]`, []);
    }
});

test.describe('Service task — sequential loop', () => {
  test.beforeEach(async ({ page }) => {
    await appendTaskToNewProcess(page, ELEMENT_ID);
    await changeElement(page, 'Service task');
    await toggleMarker(page, 'Sequential multi-instance');
  });

  test('designs the element and exports its BPMN type and variant', async ({ page }) => {
    const xml = await downloadBpmnXml(page);
    await expectDesign(page, xml, ELEMENT_ID);
  });

  test('shows, edits and persists properties through XML import', async ({ page }) => {
    const editedId = await editServiceTaskProperties(page);
    await configureServiceTask(page);
    await editMultiInstance(page);
    await expectPropertyGroups(page, [...PROPERTY_GROUPS, 'multiInstance']);
    const xml = await expectPropertiesRoundTrip(page, () => selectShape(page, editedId));
    expectMetadataXml(xml);
    await expectDesign(page, xml, editedId);
  });

  test('deploys the designed process and reads back its BPMN XML', async ({ page }) => {
    await configureServiceTask(page);
    await editMultiInstance(page, { completionCondition: false });
    const xml = await downloadBpmnXml(page);
    await expectDesign(page, xml, ELEMENT_ID);
    const response = await deployProcess(page);
    await expectDeploymentSaved(page, response, xml);
  });

  test('rejects deployment with a multi-instance completion condition', async ({ page }) => {
    await configureServiceTask(page);
    await editMultiInstance(page);
    const xml = await downloadBpmnXml(page);
    await expectDesign(page, xml, ELEMENT_ID);
    await expectCompletionConditionXml(page, xml, ELEMENT_ID);
    const response = await deployProcess(page);
    await expectDeploymentRejected(page, response, `serviceTask id="${ELEMENT_ID}" has a multi-instance completionCondition`);
  });

    async function expectDesign(page: Page, xml: string, id: string): Promise<void> {
        await expectServiceTaskXml(page, xml, id);
        await expectXmlElements(page, xml, `[id="${id}"] > :is(multiInstanceLoopCharacteristics, standardLoopCharacteristics)`, [{ name: 'multiInstanceLoopCharacteristics' }]);
        await expectXmlElements(page, xml, `[id="${id}"] > multiInstanceLoopCharacteristics`, [{ attributes: { isSequential: 'true' } }]);
    }
});

test.describe('Service task — standard loop', () => {
  test.beforeEach(async ({ page }) => {
    await appendTaskToNewProcess(page, ELEMENT_ID);
    await changeElement(page, 'Service task');
    await toggleMarker(page, 'Loop');
  });

  test('designs the element and exports its BPMN type and variant', async ({ page }) => {
    const xml = await downloadBpmnXml(page);
    await expectDesign(page, xml, ELEMENT_ID);
  });

  test('shows, edits and persists properties through XML import', async ({ page }) => {
    const editedId = await editServiceTaskProperties(page);
    await configureServiceTask(page);
    await expectPropertyGroups(page, [...PROPERTY_GROUPS, EXECUTION_LISTENER_GROUP]);
    const xml = await expectPropertiesRoundTrip(page, () => selectShape(page, editedId));
    expectMetadataXml(xml);
    await expectDesign(page, xml, editedId);
  });

  test('deploys the designed process and reads back its BPMN XML', async ({ page }) => {
    await configureServiceTask(page);
    const xml = await downloadBpmnXml(page);
    await expectDesign(page, xml, ELEMENT_ID);
    const response = await deployProcess(page);
    await expectDeploymentSaved(page, response, xml);
  });

    async function expectDesign(page: Page, xml: string, id: string): Promise<void> {
        await expectServiceTaskXml(page, xml, id);
        await expectXmlElements(page, xml, `[id="${id}"] > :is(multiInstanceLoopCharacteristics, standardLoopCharacteristics)`, [{ name: 'standardLoopCharacteristics' }]);
    }
});

test.describe('Service task with execution listeners', () => {
  test.beforeEach(async ({ page }) => {
    await appendTaskToNewProcess(page, ELEMENT_ID);
    await changeElement(page, 'Service task');
  });

  test('designs a start and an end listener and exports them in the order of the model', async ({ page }) => {
    await configureServiceTask(page);
    await designListeners(page, ELEMENT_ID);
    const xml = await downloadBpmnXml(page);
    await expectServiceTaskXml(page, xml, ELEMENT_ID);
    await expectListenersXml(page, xml, ELEMENT_ID, LISTENERS);
  });

  test('shows, edits and persists properties through XML import', async ({ page }) => {
    const editedId = await editServiceTaskProperties(page);
    await configureServiceTask(page);
    await designListeners(page, editedId);
    await expectPropertyGroups(page, [...PROPERTY_GROUPS, EXECUTION_LISTENER_GROUP]);
    const xml = await expectPropertiesRoundTrip(page, () => selectShape(page, editedId));
    expectMetadataXml(xml);
    await expectServiceTaskXml(page, xml, editedId);
    await expectListenersXml(page, xml, editedId, LISTENERS);
  });

  test('deploys the designed process and reads back its BPMN XML', async ({ page }) => {
    await configureServiceTask(page);
    await designListeners(page, ELEMENT_ID);
    const xml = await downloadBpmnXml(page);
    await expectListenersXml(page, xml, ELEMENT_ID, LISTENERS);
    const response = await deployProcess(page);
    await expectDeploymentSaved(page, response, xml);
  });

  test('flags two start listeners of one type, which the engine refuses at deployment', async ({ page }) => {
    await configureServiceTask(page);
    const first = await addListener(page, ELEMENT_ID, { eventType: 'start', type: 'audit' });
    const second = await addListener(page, ELEMENT_ID, { eventType: 'start', type: 'audit' });
    for (const index of [first, second]) {
      await expect(entry(page, listenerEntry(ELEMENT_ID, index, 'type')).locator('.bio-properties-panel-error'))
        .toContainText('two listeners of one event type need different types');
    }
    const response = await deployProcess(page);
    await expectDeploymentRejected(page, response, 'has two execution listeners with eventType="start" and type="audit"');
  });

  test('accepts the same type once on a start and once on an end listener', async ({ page }) => {
    await configureServiceTask(page);
    const start = await addListener(page, ELEMENT_ID, { eventType: 'start', type: 'audit' });
    const end = await addListener(page, ELEMENT_ID, { eventType: 'end', type: 'audit' });
    for (const index of [start, end]) {
      await expect(entry(page, listenerEntry(ELEMENT_ID, index, 'type')).locator('.bio-properties-panel-error')).toHaveCount(0);
    }
    const xml = await downloadBpmnXml(page);
    const response = await deployProcess(page);
    await expectDeploymentSaved(page, response, xml);
  });

  async function designListeners(page: Page, id: string): Promise<void> {
    for (const listener of LISTENERS) await addListener(page, id, listener);
  }
});

async function configureServiceTask(page: Page): Promise<void> {
    await openGroup(page, 'zenbpm-taskDefinition');
    await fillEntry(page, 'zenbpm-taskDef-type', 'e2e-worker');
    await fillEntry(page, 'zenbpm-taskDef-retries', '3');
}

async function editServiceTaskProperties(page: Page): Promise<string> {
    await openGroup(page, 'general');
    await fillEntry(page, 'name', 'service task edited');
    const editedId = `${ELEMENT_ID}_edited`;
    await editMetadata(page, editedId);
    await editInputMappings(page, editedId);
    await editOutputMappings(page, editedId);
    await editExtensionProperties(page, editedId);
    await editExampleData(page);
    return editedId;
}

async function expectServiceTaskXml(page: Page, xml: string, id: string): Promise<void> {
    await expectValidBpmnXml(page, xml);
    await expectXmlElements(page, xml, `[id="${id}"]`, [{ name: 'serviceTask' }]);
    await expectXmlElements(page, xml, `BPMNShape[bpmnElement="${id}"]`, [{ name: 'BPMNShape' }]);
}

async function expectCompletionConditionXml(page: Page, xml: string, id: string): Promise<void> {
    await expectXmlElements(page, xml, `[id="${id}"] > multiInstanceLoopCharacteristics > completionCondition`, [{ name: 'completionCondition' }]);
}
