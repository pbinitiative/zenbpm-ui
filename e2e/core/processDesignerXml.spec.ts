import { expect, test } from '@playwright/test';

const bpmnWithComment = `<?xml version="1.0" encoding="UTF-8"?>
<!-- Keep this comment when viewing XML -->
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1" isExecutable="true">
    <bpmn:startEvent id="StartEvent_1" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      <bpmndi:BPMNShape id="StartEvent_1_di" bpmnElement="StartEvent_1">
        <dc:Bounds x="179" y="99" width="36" height="36" />
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;

test('preserves XML comments when returning to XML mode without diagram edits', async ({ page }) => {
  await page.goto('/designer/process');

  await page.getByRole('button', { name: 'XML', exact: true }).click();
  await page.getByTestId('process-designer-file-input').setInputFiles({
    name: 'commented-process.bpmn',
    mimeType: 'application/xml',
    buffer: Buffer.from(bpmnWithComment),
  });

  await page.getByRole('button', { name: 'Diagram', exact: true }).click();
  await expect(page.getByTitle('Activate hand tool', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'XML', exact: true }).click();
  await expect(page.locator('.monaco-editor')).toContainText('Keep this comment when viewing XML');
});
