/** Decodes the BPMN of a definition, which the API hands out as XML or as base64 of it. */
function xmlOf(bpmnData: string): string {
  if (bpmnData.trimStart().startsWith('<')) return bpmnData;
  return new TextDecoder().decode(Uint8Array.from(atob(bpmnData), (character) => character.charCodeAt(0)));
}

function childrenNamed(parent: Element, localName: string): Element[] {
  return Array.from(parent.children).filter((child) => child.localName === localName);
}

/** Whether the element carries an execution listener, in whatever namespace, as the engine reads it. */
function carriesAnExecutionListener(element: Element): boolean {
  return childrenNamed(element, 'extensionElements').some((extensionElements) =>
    childrenNamed(extensionElements, 'executionListeners').some(
      (listeners) => childrenNamed(listeners, 'executionListener').length > 0
    )
  );
}

/** Reads the model of a definition; undefined where there is none or it cannot be read. */
function modelOf(bpmnData: string | undefined): Document | undefined {
  if (!bpmnData) return undefined;
  try {
    const model = new DOMParser().parseFromString(xmlOf(bpmnData), 'text/xml');
    // XML which does not parse comes back as a document which says so
    return model.getElementsByTagName('parsererror').length > 0 ? undefined : model;
  } catch {
    return undefined;
  }
}

/**
 * The ids of the elements of a process model which have jobs although their
 * element type alone does not say so: a start event of the process which
 * carries execution listeners, whose jobs hold the token at the event, and an
 * intermediate event which throws a message, which is the work of a job.
 *
 * The history of an instance names the type of an element, not whether it has
 * jobs, and the Jobs tab holds one page of them at a time. The model is the
 * one source which tells it for every element at once.
 */
export function elementIdsWithJobsTheirTypeDoesNotTell(bpmnData: string | undefined): ReadonlySet<string> {
  const ids = new Set<string>();
  const model = modelOf(bpmnData);
  // no model, no element known to have jobs: the caller goes by the element types alone
  if (!model) return ids;
  for (const event of Array.from(model.getElementsByTagNameNS('*', 'startEvent'))) {
    // the engine runs the listeners of a start event only directly under the process
    if (event.parentElement?.localName === 'process' && carriesAnExecutionListener(event) && event.id) {
      ids.add(event.id);
    }
  }
  for (const event of Array.from(model.getElementsByTagNameNS('*', 'intermediateThrowEvent'))) {
    if (childrenNamed(event, 'messageEventDefinition').length > 0 && event.id) ids.add(event.id);
  }
  return ids;
}

/**
 * The ids of the elements of a process model which carry execution listeners,
 * or undefined where the model does not tell.
 *
 * An element instance has one job, unless its element carries listeners: then
 * their jobs and the element's own share it. So this tells whether the jobs
 * of an element instance may lie on several pages of the Jobs tab.
 */
export function elementIdsWithExecutionListeners(bpmnData: string | undefined): ReadonlySet<string> | undefined {
  const model = modelOf(bpmnData);
  if (!model) return undefined;
  const ids = new Set<string>();
  for (const listeners of Array.from(model.getElementsByTagNameNS('*', 'executionListeners'))) {
    const element = listeners.parentElement?.parentElement;
    if (element?.id && carriesAnExecutionListener(element)) ids.add(element.id);
  }
  return ids;
}
