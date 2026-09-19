import { expect, type Page } from '@playwright/test';

import {
  appendElement,
  changeElement,
  connectElements,
  createFromPalette,
  createProcess,
  pointOnShape,
  renameSelectedElement,
  selectContainer,
  selectShape,
} from '../../helpers/processDesigner';
import {
  COMMON_PROPERTY_GROUPS,
  editExampleData,
  editExtensionProperties,
  editMetadata,
  editOutputMappings,
} from '../../helpers/commonProperties';
import { fillEntry, openGroup } from '../../helpers/propertiesPanel';
import { expectValidBpmnXml, expectXmlElements } from '../../helpers/bpmnAssertions';

export const ELEMENT_ID = 'Element_under_test';
export const PROPERTY_GROUPS = [
  ...COMMON_PROPERTY_GROUPS,
  'zenbpm-ioMapping-outputs',
];

export async function createBoundaryDiagram(page: Page): Promise<void> {
  await createProcess(page);
  await appendElement(page, 'Start', 'Append task', 'Host_task');
  await changeElement(page, 'User task');
  await appendElement(page, 'Host_task', 'Append end event', 'End');
  const attachedAt = await pointOnShape(page, 'Host_task', { x: 0.5, y: 1 });
  await createFromPalette(page, 'Create intermediate/boundary event', attachedAt, ELEMENT_ID);
  await createFromPalette(page, 'Create end event', { x: 850, y: 600 }, 'Boundary_end');
  await connectElements(page, ELEMENT_ID, 'Boundary_end', 'Boundary_out');
}

export async function createCancelBoundaryDiagram(page: Page): Promise<void> {
  await createProcess(page);
  const children = await createFromPalette(page, 'Create expanded sub-process', { x: 450, y: 250 }, 'Subprocess');
  expect(children).toHaveLength(1);
  await selectShape(page, children[0]);
  await renameSelectedElement(page, 'Inner_start');
  await appendElement(page, 'Inner_start', 'Append task', 'Inner_task');
  await changeElement(page, 'User task');
  await appendElement(page, 'Inner_task', 'Append end event', 'Inner_end');
  await createFromPalette(page, 'Create end event', { x: 1000, y: 250 }, 'End');
  await connectElements(page, 'Start', 'Subprocess', 'Flow_in', { x: 0.02, y: 0.5 });
  await selectContainer(page, 'Subprocess');
  await connectElements(page, 'Subprocess', 'End', 'Flow_out');
  await selectContainer(page, 'Subprocess');
  await changeElement(page, 'Transaction');
  const attachedAt = await pointOnShape(page, 'Subprocess', { x: 0.5, y: 1 });
  await createFromPalette(page, 'Create intermediate/boundary event', attachedAt, ELEMENT_ID);
  await createFromPalette(page, 'Create end event', { x: 850, y: 600 }, 'Boundary_end');
  await connectElements(page, ELEMENT_ID, 'Boundary_end', 'Boundary_out');
}

export async function editBoundaryEventProperties(page: Page): Promise<string> {
  await openGroup(page, 'general');
  await fillEntry(page, 'name', 'boundary event edited');
  const editedId = `${ELEMENT_ID}_edited`;
  await editMetadata(page, editedId);
  await editOutputMappings(page, editedId);
  await editExtensionProperties(page, editedId);
  await editExampleData(page);
  return editedId;
}

export async function expectBoundaryEventXml(page: Page, xml: string, id: string): Promise<void> {
  await expectValidBpmnXml(page, xml);
  await expectXmlElements(page, xml, `[id="${id}"]`, [{ name: 'boundaryEvent' }]);
  await expectXmlElements(page, xml, `BPMNShape[bpmnElement="${id}"]`, [{ name: 'BPMNShape' }]);
}
