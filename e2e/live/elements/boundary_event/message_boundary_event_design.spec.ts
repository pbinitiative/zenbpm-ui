import {test, type Page} from '@playwright/test';

import {
    changeElement,
    downloadBpmnXml,
    expectPropertiesRoundTrip,
    selectShape,
} from '../../helpers/processDesigner';
import {expectPropertyGroups, fillEntry} from '../../helpers/propertiesPanel';
import {expectMetadataXml} from '../../helpers/commonProperties';
import {editMessageReference} from '../../helpers/eventProperties';
import {expectEventDefinitions, expectXmlElements} from '../../helpers/bpmnAssertions';
import {deployProcess, expectDeploymentSaved} from '../../helpers/processDeployment';
import {
    ELEMENT_ID,
    PROPERTY_GROUPS,
    createBoundaryDiagram,
    editBoundaryEventProperties,
    expectBoundaryEventXml,
} from './boundaryEventHelpers';

test.describe('Message boundary event — interrupting', () => {
    test.beforeEach(async ({page}) => {
        await createBoundaryDiagram(page);
        await selectShape(page, ELEMENT_ID);
        await changeElement(page, 'Message boundary event');
    });

    test('designs the element and exports its BPMN type and variant', async ({page}) => {
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
    });

    test('shows, edits and persists properties through XML import', async ({page}) => {
        const editedId = await editBoundaryEventProperties(page);
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
        await expectBoundaryEventXml(page, xml, id);
        await expectXmlElements(page, xml, `[id="${id}"]`, [{attributes: {attachedToRef: 'Host_task'}}]);
        await expectEventDefinitions(page, xml, id, ['messageEventDefinition']);
    }
});

test.describe('Message boundary event — non-interrupting', () => {
    test.beforeEach(async ({page}) => {
        await createBoundaryDiagram(page);
        await selectShape(page, ELEMENT_ID);
        await changeElement(page, 'Message boundary event (non-interrupting)');
    });

    test('designs the element and exports its BPMN type and variant', async ({page}) => {
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
    });

    test('shows, edits and persists properties through XML import', async ({page}) => {
        const editedId = await editBoundaryEventProperties(page);
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
        await expectBoundaryEventXml(page, xml, id);
        await expectXmlElements(page, xml, `[id="${id}"]`, [{attributes: {attachedToRef: 'Host_task'}}]);
        await expectEventDefinitions(page, xml, id, ['messageEventDefinition']);
        await expectXmlElements(page, xml, `[id="${id}"]`, [{attributes: {cancelActivity: 'false'}}]);
    }
});
