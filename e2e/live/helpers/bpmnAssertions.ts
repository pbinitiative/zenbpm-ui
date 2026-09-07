import { expect, type Page } from '@playwright/test';

type XmlElementExpectation = {
  name?: string;
  attributes?: Record<string, string>;
};

/** Assert exactly the nodes selected by the test, without inferring BPMN behavior. */
export async function expectXmlElements(
  page: Page, xml: string, selector: string, expected: XmlElementExpectation[],
): Promise<void> {
  const nodes = await page.evaluate(({ xml, selector }) => {
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    return Array.from(doc.querySelectorAll(selector)).map(node => ({
      name: node.localName,
      attributes: Object.fromEntries(Array.from(node.attributes).map(attr => [attr.name, attr.value])),
    }));
  }, { xml, selector });
  expect(nodes, selector).toMatchObject(expected);
}

export async function expectEventDefinitions(page: Page, xml: string, id: string, expected: string[]): Promise<void> {
  const definitions = await page.evaluate(({ xml, id }) => {
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    return Array.from(doc.getElementById(id)?.children ?? [])
      .map(child => child.localName).filter(name => name.endsWith('EventDefinition'));
  }, { xml, id });
  expect(definitions).toEqual(expected);
}

export async function expectValidBpmnXml(page: Page, xml: string): Promise<void> {
  const result = await page.evaluate(({ xml }) => {
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    const referenceAttributes = ['sourceRef', 'targetRef', 'attachedToRef', 'bpmnElement', 'processRef', 'dataObjectRef', 'dataStoreRef', 'categoryValueRef', 'messageRef', 'signalRef', 'errorRef', 'escalationRef'];
    const references = Array.from(doc.querySelectorAll('*')).flatMap(node => referenceAttributes.flatMap(attribute => {
      const value = node.getAttribute(attribute);
      return value && !doc.getElementById(value) ? [`${node.localName}.${attribute}=${value}`] : [];
    }));
    // BPMN DI applies to rendered nodes and connections, not global definitions.
    const renderedElements = doc.querySelectorAll([
      'startEvent', 'endEvent', 'intermediateCatchEvent', 'intermediateThrowEvent', 'boundaryEvent',
      'task', 'userTask', 'serviceTask', 'sendTask', 'receiveTask', 'manualTask', 'scriptTask',
      'businessRuleTask', 'callActivity', 'subProcess', 'transaction', 'adHocSubProcess',
      'exclusiveGateway', 'parallelGateway', 'inclusiveGateway', 'complexGateway', 'eventBasedGateway',
      'participant', 'lane', 'dataObjectReference', 'dataStoreReference', 'textAnnotation', 'group',
      'sequenceFlow', 'messageFlow', 'association', 'dataInputAssociation', 'dataOutputAssociation',
    ].join(', '));
    const missingDi = Array.from(renderedElements)
      .filter(node => !doc.querySelector(`[bpmnElement="${node.id}"]`)).map(node => node.id);
    const textReferences = Array.from(doc.querySelectorAll('sourceRef, targetRef, flowNodeRef, incoming, outgoing'))
      .map(node => node.textContent?.trim() ?? '').filter(id => !doc.getElementById(id));
    references.push(...textReferences);
    return { error: doc.querySelector('parsererror')?.textContent, references, missingDi };
  }, { xml });
  expect(result.error).toBeUndefined();
  expect(result.references, 'All BPMN references resolve').toEqual([]);
  expect(result.missingDi, 'Every visible element and connection has BPMNDI').toEqual([]);
}
