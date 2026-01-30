const BPMN_NS = 'http://www.omg.org/spec/BPMN/20100524/MODEL';
const ZEEBE_NS = 'http://camunda.org/schema/zeebe/1.0';

/**
 * Escape a string for use as a FEEL string literal.
 * FEEL uses \" for embedded quotes and \\ for backslashes.
 */
function toFeelStringLiteral(value: string): string {
  const escaped = value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"');
  return `="${escaped}"`;
}

/**
 * Find or create a child element with the given namespace and local name.
 */
function findOrCreateChild(
  doc: Document,
  parent: Element,
  ns: string,
  localName: string,
  prefix: string,
): Element {
  const existing = parent.getElementsByTagNameNS(ns, localName);
  if (existing.length > 0) return existing[0];

  const el = doc.createElementNS(ns, `${prefix}:${localName}`);
  parent.appendChild(el);
  return el;
}

/**
 * Transform BPMN XML before deployment.
 *
 * For each bpmn:UserTask that has a zeebe:Property named "ZEN_FORM":
 * 1. Read the property value (JSON form schema)
 * 2. Add/update a zeebe:Input mapping with target="ZEN_FORM" and
 *    source set to a FEEL string literal of the JSON
 *
 * This ensures the ZEN_FORM variable is available on the user task
 * job when it's created by the engine.
 */
export function transformXmlForDeploy(xml: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'application/xml');

  // Check for parse errors
  const parseError = doc.getElementsByTagName('parsererror');
  if (parseError.length > 0) {
    return xml; // Return unchanged if XML is invalid
  }

  const userTasks = doc.getElementsByTagNameNS(BPMN_NS, 'userTask');

  for (let i = 0; i < userTasks.length; i++) {
    const task = userTasks[i];

    // Find extensionElements
    const extensionElementsList = task.getElementsByTagNameNS(
      BPMN_NS,
      'extensionElements',
    );
    if (extensionElementsList.length === 0) continue;
    const extEl = extensionElementsList[0];

    // Find zeebe:properties container
    const zeebePropertiesList = extEl.getElementsByTagNameNS(
      ZEEBE_NS,
      'properties',
    );
    if (zeebePropertiesList.length === 0) continue;

    // Find ZEN_FORM property
    const propertyElements = zeebePropertiesList[0].getElementsByTagNameNS(
      ZEEBE_NS,
      'property',
    );
    let jsonFormValue: string | null = null;

    for (let j = 0; j < propertyElements.length; j++) {
      if (propertyElements[j].getAttribute('name') === 'ZEN_FORM') {
        jsonFormValue = propertyElements[j].getAttribute('value');
        break;
      }
    }

    if (!jsonFormValue) continue;

    // Minify JSON to avoid issues with newlines in FEEL string literals
    let minified = jsonFormValue;
    try {
      const parsed: unknown = JSON.parse(jsonFormValue);
      minified = JSON.stringify(parsed);
    } catch {
      // If not valid JSON, use raw value
    }

    // Create the FEEL expression
    const feelExpression = toFeelStringLiteral(minified);

    // Find or create zeebe:ioMapping
    const ioMapping = findOrCreateChild(
      doc,
      extEl,
      ZEEBE_NS,
      'ioMapping',
      'zeebe',
    );

    // Find existing ZEN_FORM input or create new one
    const inputs = ioMapping.getElementsByTagNameNS(ZEEBE_NS, 'input');
    let existingInput: Element | null = null;

    for (let j = 0; j < inputs.length; j++) {
      if (inputs[j].getAttribute('target') === 'ZEN_FORM') {
        existingInput = inputs[j];
        break;
      }
    }

    if (existingInput) {
      existingInput.setAttribute('source', feelExpression);
    } else {
      const inputEl = doc.createElementNS(ZEEBE_NS, 'zeebe:input');
      inputEl.setAttribute('source', feelExpression);
      inputEl.setAttribute('target', 'ZEN_FORM');
      ioMapping.appendChild(inputEl);
    }
  }

  return new XMLSerializer().serializeToString(doc);
}
