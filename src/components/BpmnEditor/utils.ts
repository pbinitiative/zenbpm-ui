// Default empty BPMN diagram with Zeebe/Camunda 8 extensions

export const emptyDiagram = () => {
    const processId = `Process_${randomId()}`;
    return `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
  xmlns:zeebe="http://camunda.org/schema/zeebe/1.0"
  xmlns:modeler="http://camunda.org/schema/modeler/1.0"
  id="Definitions_${processId}"
  targetNamespace="http://bpmn.io/schema/bpmn"
  exporter="ZenBPM Modeler"
  exporterVersion="1.0.0"
  modeler:executionPlatform="Camunda Cloud"
  modeler:executionPlatformVersion="8.0.0">
  <bpmn:process id="${processId}" isExecutable="true">
    <bpmn:startEvent id="StartEvent_1" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="${processId}">
      <bpmndi:BPMNShape id="_BPMNShape_StartEvent_1" bpmnElement="StartEvent_1">
        <dc:Bounds x="173" y="102" width="36" height="36" />
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;
}

export const randomId = (length = 8) => {
  const bytes = new Uint8Array(Math.ceil(length / 2));
  crypto.getRandomValues(bytes);
  let hex = '';
  bytes.forEach(number => hex += number.toString(16).padStart(2, '0'))
  return (length % 2) ? hex.slice(0, length) : hex;
}
