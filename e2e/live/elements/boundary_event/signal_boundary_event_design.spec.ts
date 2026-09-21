import {test, type Page} from '@playwright/test';

import {
    changeElement,
    downloadBpmnXml,
    expectPropertiesRoundTrip,
    selectShape,
} from '../../helpers/processDesigner';
import {expectPropertyGroups} from '../../helpers/propertiesPanel';
import {expectMetadataXml} from '../../helpers/commonProperties';
import {editSignalReference} from '../../helpers/eventProperties';
import {expectEventDefinitions, expectXmlElements} from '../../helpers/bpmnAssertions';
import {deployProcess, expectDeploymentRejected} from '../../helpers/processDeployment';
import {
    ELEMENT_ID,
    PROPERTY_GROUPS,
    createBoundaryDiagram,
    editBoundaryEventProperties,
    expectBoundaryEventXml,
} from './boundaryEventHelpers';

test.describe('Signal boundary event — interrupting', () => {
    test.beforeEach(async ({page}) => {
        await createBoundaryDiagram(page);
        await selectShape(page, ELEMENT_ID);
        await changeElement(page, 'Signal boundary event');
    });

    test('designs the element and exports its BPMN type and variant', async ({page}) => {
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
    });

    test('shows, edits and persists properties through XML import', async ({page}) => {
        const editedId = await editBoundaryEventProperties(page);
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
        await expectBoundaryEventXml(page, xml, id);
        await expectXmlElements(page, xml, `[id="${id}"]`, [{attributes: {attachedToRef: 'Host_task'}}]);
        await expectEventDefinitions(page, xml, id, ['signalEventDefinition']);
    }
});

test.describe('Signal boundary event — non-interrupting', () => {
    test.beforeEach(async ({page}) => {
        await createBoundaryDiagram(page);
        await selectShape(page, ELEMENT_ID);
        await changeElement(page, 'Signal boundary event (non-interrupting)');
    });

    test('designs the element and exports its BPMN type and variant', async ({page}) => {
        const xml = await downloadBpmnXml(page);
        await expectDesign(page, xml, ELEMENT_ID);
    });

    test('shows, edits and persists properties through XML import', async ({page}) => {
        const editedId = await editBoundaryEventProperties(page);
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
        await expectBoundaryEventXml(page, xml, id);
        await expectXmlElements(page, xml, `[id="${id}"]`, [{attributes: {attachedToRef: 'Host_task'}}]);
        await expectEventDefinitions(page, xml, id, ['signalEventDefinition']);
        await expectXmlElements(page, xml, `[id="${id}"]`, [{attributes: {cancelActivity: 'false'}}]);
    }
});
