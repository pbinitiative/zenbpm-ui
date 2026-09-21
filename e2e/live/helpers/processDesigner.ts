import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';

import { expect, test, type Page } from '@playwright/test';

import { createElementProcessIdentity } from './processNaming';
import { entry, fillEntry, openGroup, propertySnapshot } from './propertiesPanel';

export async function openProcessDesigner(page: Page): Promise<void> {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto('/designer/process');
  await expect(page.locator('.djs-element[data-element-id="StartEvent_1"]')).toBeVisible();
}

export async function selectProcess(page: Page): Promise<void> {
  await page.locator('.djs-container > svg').click({ position: { x: 200, y: 40 } });
  await openGroup(page, 'general');
}

export async function currentProcessId(page: Page): Promise<string> {
  const id = await page.locator('.djs-container > svg').getAttribute('data-element-id');
  expect(id).toBeTruthy();
  return id!;
}

/** Start with the designer's new-process screen and edit its identity through the panel. */
export async function createProcess(page: Page): Promise<string> {
  await openProcessDesigner(page);
  const testInfo = test.info();
  const identity = createElementProcessIdentity({
    randomSuffix: randomUUID().slice(0, 8),
    specFile: testInfo.file,
    suiteTitle: testInfo.titlePath.slice(1, -1).join(' '),
  });
  await openGroup(page, 'general');
  await fillEntry(page, 'id', identity.processId);
  await fillEntry(page, 'name', identity.processName);
  await selectShape(page, 'StartEvent_1');
  await renameSelectedElement(page, 'Start');
  await moveShape(page, 'Start', { x: 160, y: 180 });
  return identity.processId;
}

/** Build start → task → end through context-pad append actions. */
export async function appendTaskToNewProcess(page: Page, elementId: string): Promise<void> {
  await createProcess(page);
  await appendElement(page, 'Start', 'Append task', elementId);
  await appendElement(page, elementId, 'Append end event', 'End');
  await selectShape(page, elementId);
}

export async function renameSelectedElement(page: Page, id: string): Promise<void> {
  await openGroup(page, 'general');
  await fillEntry(page, 'id', id);
}

type CanvasPoint = { x: number; y: number };

async function screenPoint(page: Page, point: CanvasPoint): Promise<CanvasPoint> {
  const canvas = await page.locator('.djs-container > svg').boundingBox();
  expect(canvas).toBeTruthy();
  return { x: canvas!.x + point.x, y: canvas!.y + point.y };
}

export async function shapeCenter(page: Page, id: string): Promise<CanvasPoint> {
  const bounds = await page.locator(`.djs-shape[data-element-id="${id}"] > .djs-visual`).boundingBox();
  expect(bounds).toBeTruthy();
  return { x: bounds!.x + bounds!.width / 2, y: bounds!.y + bounds!.height / 2 };
}

export async function moveShape(page: Page, id: string, destination: CanvasPoint): Promise<void> {
  const from = await shapeCenter(page, id);
  const to = await screenPoint(page, destination);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 10 });
  await page.mouse.up();
  await page.keyboard.press('Escape');
}

export async function appendElement(page: Page, sourceId: string, title: string, id: string): Promise<string[]> {
  const previousIds = await page.locator('.djs-connection').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-element-id')));
  await selectShape(page, sourceId);
  await page.getByTitle(title, { exact: true }).click();
  await page.keyboard.press('Escape');
  await renameSelectedElement(page, id);
  return page.locator('.djs-connection').evaluateAll((nodes, previousIds) => nodes
    .map(node => node.getAttribute('data-element-id')!).filter(id => !previousIds.includes(id)), previousIds);
}

export async function createFromPalette(page: Page, title: string, position: CanvasPoint, id: string): Promise<string[]> {
  const previousIds = await page.locator('.djs-shape:not(.djs-label)').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-element-id')));
  await page.locator('.djs-palette').getByTitle(title, { exact: true }).click();
  const point = await screenPoint(page, position);
  await page.mouse.move(point.x, point.y, { steps: 10 });
  await page.mouse.click(point.x, point.y);
  await page.keyboard.press('Escape');
  await renameSelectedElement(page, id);
  // Some palette entries also create nested shapes, such as a sub-process start.
  return page.locator('.djs-shape:not(.djs-label)').evaluateAll((nodes, { previousIds, id }) => nodes
    .map(node => node.getAttribute('data-element-id')!).filter(createdId => createdId !== id && !previousIds.includes(createdId)), { previousIds, id });
}

export async function pointOnShape(page: Page, id: string, anchor: CanvasPoint): Promise<CanvasPoint> {
  const bounds = await page.locator(`.djs-shape[data-element-id="${id}"] > .djs-visual`).boundingBox();
  const canvas = await page.locator('.djs-container > svg').boundingBox();
  expect(bounds).toBeTruthy();
  expect(canvas).toBeTruthy();
  return { x: bounds!.x - canvas!.x + bounds!.width * anchor.x, y: bounds!.y - canvas!.y + bounds!.height * anchor.y };
}

export async function connectElements(page: Page, sourceId: string, targetId: string, id: string, targetAnchor = { x: 0.5, y: 0.5 }): Promise<void> {
  const previousIds = await page.locator('.djs-connection').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-element-id')));
  await selectShape(page, sourceId);
  await page.locator('.djs-context-pad.open [data-action="connect"]').click();
  const target = await screenPoint(page, await pointOnShape(page, targetId, targetAnchor));
  await page.mouse.move(target.x, target.y, { steps: 10 });
  await page.mouse.click(target.x, target.y);
  await page.keyboard.press('Escape');
  const created = page.locator('.djs-connection');
  await expect(created).toHaveCount(previousIds.length + 1);
  const newIds = await created.evaluateAll((nodes, previousIds) => nodes
    .map(node => node.getAttribute('data-element-id')!).filter(id => !previousIds.includes(id)), previousIds);
  expect(newIds).toHaveLength(1);
  await selectConnection(page, newIds[0]);
  await renameSelectedElement(page, id);
}

export async function deleteShape(page: Page, id: string): Promise<void> {
  await selectShape(page, id);
  await page.locator('.djs-context-pad.open [data-action="delete"]').click();
  await expect(page.locator(`.djs-shape[data-element-id="${id}"]`)).toHaveCount(0);
}

export async function selectShape(page: Page, id: string): Promise<void> {
  const point = await shapeCenter(page, id);
  await selectWith(page, id, () => page.mouse.click(point.x, point.y));
}

export async function selectContainer(page: Page, id: string): Promise<void> {
  const shape = page.locator(`.djs-shape[data-element-id="${id}"]`);
  // A border click selects a container without selecting its children.
  await selectWith(page, id, () => shape.click({ position: { x: 8, y: 8 } }));
}

export async function selectConnection(page: Page, id: string): Promise<void> {
  const connection = page.locator(`.djs-connection[data-element-id="${id}"]`);
  await expect(connection).toBeAttached();
  // Horizontal and vertical SVG paths have a zero-sized bounding box.
  const point = await connection.locator('path.djs-hit').evaluate((path: SVGPathElement) => {
    const midpoint = path.getPointAtLength(path.getTotalLength() / 2);
    const position = new DOMPoint(midpoint.x, midpoint.y).matrixTransform(path.getScreenCTM()!);
    return { x: position.x, y: position.y };
  });
  await selectWith(page, id, () => page.mouse.click(point.x, point.y));
}

async function selectWith(page: Page, id: string, click: () => Promise<void>): Promise<void> {
  // diagram-js suppresses a ghost click after dragging/creating a shape. Retry
  // selection against the visible panel state rather than sleeping for its timer.
  await expect(async () => {
    const selectedId = entry(page, 'id').getByRole('textbox');
    if (!(await selectedId.count()) || await selectedId.inputValue() !== id) {
      // Dismiss the previous context pad so its actions cannot cover the target.
      const contextPad = page.locator('.djs-context-pad.open');
      if (await contextPad.count()) {
        await page.locator('.djs-container > svg').click({ position: { x: 200, y: 40 } });
        await expect(contextPad).toHaveCount(0, { timeout: 100 });
      }
      await click();
    }
    await openGroup(page, 'general');
    await expect(selectedId).toHaveValue(id, { timeout: 100 });
  }).toPass({ timeout: 5000, intervals: [100, 250] });
}

export async function changeElement(page: Page, label: string): Promise<void> {
  await page.getByTitle('Change element', { exact: true }).click();
  await page.locator('.djs-popup').getByText(label, { exact: true }).click();
}

export async function downloadBpmnXml(page: Page): Promise<string> {
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /^download$/i }).click(),
  ]);
  const path = await download.path();
  expect(path).toBeTruthy();
  return readFile(path!, 'utf8');
}

export async function importBpmnXml(page: Page, xml: string): Promise<void> {
  const previousShape = await page.locator('.djs-element').first().elementHandle();
  await page.getByTestId('process-designer-file-input').setInputFiles({
    name: 'element-design.bpmn', mimeType: 'application/xml', buffer: Buffer.from(xml),
  });
  if (previousShape) {
    await expect.poll(() => previousShape.evaluate(element => element.isConnected)).toBe(false);
  }
  await expect(page.locator('.bjs-container')).toBeVisible();
}

export async function toggleMarker(page: Page, title: string): Promise<void> {
  await page.getByTitle('Change element', { exact: true }).click();
  await page.locator('.djs-popup').getByTitle(title, { exact: true }).click();
  await page.keyboard.press('Escape');
}

export async function toggleMenuItem(page: Page, id: string): Promise<void> {
  await page.getByTitle('Change element', { exact: true }).click();
  await page.locator(`.djs-popup [data-id="${id}"]`).click();
  await page.keyboard.press('Escape');
}

export async function expectPropertiesRoundTrip(
  page: Page,
  selectRestoredElement: () => Promise<void>,
): Promise<string> {
  const before = await propertySnapshot(page);
  const xml = await downloadBpmnXml(page);
  await importBpmnXml(page, xml);
  await selectRestoredElement();
  expect(await propertySnapshot(page)).toEqual(before);
  return xml;
}
