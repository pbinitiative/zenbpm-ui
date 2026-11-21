/** Decodes the BPMN of a definition, which the API hands out as XML or as base64 of it. */
function xmlOf(bpmnData: string): string {
  if (bpmnData.trimStart().startsWith('<')) return bpmnData;
  return new TextDecoder().decode(Uint8Array.from(atob(bpmnData), (character) => character.charCodeAt(0)));
}

function childrenNamed(parent: Element, localName: string): Element[] {
  return Array.from(parent.children).filter((child) => child.localName === localName);
}

/** How many execution listeners the element carries, in whatever namespace, as the engine reads them. */
function executionListenersOf(element: Element): number {
  return childrenNamed(element, 'extensionElements')
    .flatMap((extensionElements) => childrenNamed(extensionElements, 'executionListeners'))
    .reduce((count, listeners) => count + childrenNamed(listeners, 'executionListener').length, 0);
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
    if (event.parentElement?.localName === 'process' && executionListenersOf(event) > 0 && event.id) {
      ids.add(event.id);
    }
  }
  for (const event of Array.from(model.getElementsByTagNameNS('*', 'intermediateThrowEvent'))) {
    if (childrenNamed(event, 'messageEventDefinition').length > 0 && event.id) ids.add(event.id);
  }
  return ids;
}

/**
 * The most jobs one instance of each element with execution listeners can
 * have, by the id of the element, or undefined where the model does not
 * tell. The engine creates one job for every listener and one for the work
 * of the element itself; a start event has no work of its own.
 *
 * An element instance has one job, unless its element carries listeners:
 * then their jobs and the element's own share it, and may lie on several
 * pages of the Jobs tab. An element the map does not hold has one job.
 */
export function mostJobsOfElementsWithExecutionListeners(
  bpmnData: string | undefined
): ReadonlyMap<string, number> | undefined {
  const model = modelOf(bpmnData);
  if (!model) return undefined;
  const mostJobs = new Map<string, number>();
  for (const listeners of Array.from(model.getElementsByTagNameNS('*', 'executionListeners'))) {
    const element = listeners.parentElement?.parentElement;
    if (!element?.id || mostJobs.has(element.id)) continue;
    const listenerJobs = executionListenersOf(element);
    if (listenerJobs > 0) mostJobs.set(element.id, listenerJobs + (element.localName === 'startEvent' ? 0 : 1));
  }
  return mostJobs;
}
