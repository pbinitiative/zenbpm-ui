import { test, type Page } from '@playwright/test';

import {
  changeElement,
  downloadBpmnXml,
  expectPropertiesRoundTrip,
  selectShape,
} from '../../helpers/processDesigner';
import { expectPropertyGroups } from '../../helpers/propertiesPanel';
import { expectMetadataXml } from '../../helpers/commonProperties';
import { expectEventDefinitions, expectXmlElements } from '../../helpers/bpmnAssertions';
import { deployProcess, expectDeploymentRejected } from '../../helpers/processDeployment';
import {
  ELEMENT_ID,
  PROPERTY_GROUPS,
  createCancelBoundaryDiagram,
  editBoundaryEventProperties,
  expectBoundaryEventXml,
} from './boundaryEventHelpers';

test.describe('Cancel boundary event', () => {
  test.beforeEach(async ({ page }) => {
    await createCancelBoundaryDiagram(page);
    await selectShape(page, ELEMENT_ID);
    await changeElement(page, 'Cancel boundary event');
  });

  test('designs the element and exports its BPMN type and variant', async ({ page }) => {
    const xml = await downloadBpmnXml(page);
    await expectDesign(page, xml, ELEMENT_ID);
  });

  test('shows, edits and persists properties through XML import', async ({ page }) => {
    const editedId = await editBoundaryEventProperties(page);
    await expectPropertyGroups(page, PROPERTY_GROUPS);
    const xml = await expectPropertiesRoundTrip(page, () => selectShape(page, editedId));
    expectMetadataXml(xml);
    await expectDesign(page, xml, editedId);
  });

  test('rejects unsupported deployment with a specific validation error', async ({ page }) => {
    const xml = await downloadBpmnXml(page);
    await expectDesign(page, xml, ELEMENT_ID);
    const response = await deployProcess(page);
    await expectDeploymentRejected(page, response, 'failed to get process definition id: failed to unmarshal xml data: failed to resolve references: unsupported element type \'transaction\' (ids: [Subprocess]): use supported elements only');
  });

  async function expectDesign(page: Page, xml: string, id: string): Promise<void> {
    await expectBoundaryEventXml(page, xml, id);
    await expectXmlElements(page, xml, `[id="${id}"]`, [{ attributes: { attachedToRef: 'Subprocess' } }]);
    await expectEventDefinitions(page, xml, id, ['cancelEventDefinition']);
  }
});
