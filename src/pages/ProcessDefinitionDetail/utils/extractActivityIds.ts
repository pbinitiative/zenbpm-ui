/**
 * Extracts activity IDs from BPMN XML data
 */
export function extractActivityIds(bpmnData: string): string[] {
  try {
    // Decode base64 if needed
    let xml = bpmnData;
    if (!bpmnData.startsWith('<')) {
      xml = new TextDecoder().decode(Uint8Array.from(atob(bpmnData), (c) => c.charCodeAt(0)));
    }

    // Parse XML and extract element IDs
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'text/xml');

    // Get all BPMN flow nodes (tasks, events, gateways, etc.)
    const ids: string[] = [];
    const selectors = [
      'task',
      'serviceTask',
      'userTask',
      'scriptTask',
      'sendTask',
      'receiveTask',
      'manualTask',
      'businessRuleTask',
      'callActivity',
      'startEvent',
      'endEvent',
      'intermediateThrowEvent',
      'intermediateCatchEvent',
      'boundaryEvent',
      'exclusiveGateway',
      'parallelGateway',
      'inclusiveGateway',
      'eventBasedGateway',
      'subProcess',
      'transaction',
    ];

    selectors.forEach((selector) => {
      // Try with bpmn: prefix and without
      doc.querySelectorAll(`bpmn\\:${selector}, ${selector}`).forEach((el) => {
        const id = el.getAttribute('id');
        if (id) ids.push(id);
      });
    });

    return ids.sort();
  } catch {
    return [];
  }
}
