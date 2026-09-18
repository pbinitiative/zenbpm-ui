import {expect, test, type Page} from '@playwright/test';

import {
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
    editExtensionProperties,
    editExampleData,
    expectMetadataXml,
} from '../../helpers/commonProperties';
import {expectXmlElements, expectValidBpmnXml} from '../../helpers/bpmnAssertions';
import {deployProcess, expectDeploymentSaved} from '../../helpers/processDeployment';

const ELEMENT_ID = 'Element_under_test';
const PROPERTY_GROUPS = COMMON_PROPERTY_GROUPS;

test.describe('Lane', () => {
    test.beforeEach(async ({page}) => {
        await createLaneDiagram(page);
        await selectContainer(page, ELEMENT_ID);
    });

    test('designs the element and exports its BPMN type and variant', async ({page}) => {
        const xml = await downloadBpmnXml(page);
        await expectLaneXml(page, xml, ELEMENT_ID);
    });

    test('shows, edits and persists properties through XML import', async ({page}) => {
        const editedId = await editLaneProperties(page);
        await expectPropertyGroups(page, PROPERTY_GROUPS);
        const xml = await expectPropertiesRoundTrip(page, () => selectContainer(page, editedId));
        expectMetadataXml(xml);
        await expectLaneXml(page, xml, editedId);
    });

    test('deploys the designed process and reads back its BPMN XML', async ({page}) => {
        const xml = await downloadBpmnXml(page);
        await expectLaneXml(page, xml, ELEMENT_ID);
        const response = await deployProcess(page);
        await expectDeploymentSaved(page, response, xml);
    });
});

async function createLaneDiagram(page: Page): Promise<void> {
    await createProcess(page);
    await appendElement(page, 'Start', 'Append task', 'Host_task');
    await changeElement(page, 'User task');
    await appendElement(page, 'Host_task', 'Append end event', 'End');
    await createFromPalette(page, 'Create pool/participant', {x: 450, y: 220}, 'Participant');
    const previousIds = await page.locator('.djs-shape:not(.djs-label)').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-element-id')));
    await page.getByTitle('Divide into two lanes', {exact: true}).click();
    const lanes = await page.locator('.djs-shape:not(.djs-label)').evaluateAll((nodes, previousIds) => nodes
        .map(node => node.getAttribute('data-element-id')!).filter(id => !previousIds.includes(id)), previousIds);
    expect(lanes).toHaveLength(2);
    await selectContainer(page, lanes[0]);
    await renameSelectedElement(page, ELEMENT_ID);
}

async function editLaneProperties(page: Page): Promise<string> {
    await openGroup(page, 'general');
    await fillEntry(page, 'name', 'lane edited');
    const editedId = `${ELEMENT_ID}_edited`;
    await editMetadata(page, editedId);
    await editExtensionProperties(page, editedId);
    await editExampleData(page);
    return editedId;
}

async function expectLaneXml(page: Page, xml: string, id: string): Promise<void> {
    await expectValidBpmnXml(page, xml);
    await expectXmlElements(page, xml, `[id="${id}"]`, [{name: 'lane'}]);
    await expectXmlElements(page, xml, `BPMNShape[bpmnElement="${id}"]`, [{name: 'BPMNShape'}]);
}
