import { expect, type Page } from '@playwright/test';

import { expectXmlElements } from './bpmnAssertions';
import { entry, fillEntry, openGroup } from './propertiesPanel';

/**
 * The panel's group of execution listeners. It is offered where the engine
 * runs listeners: on a service, send or user task, a business rule task done
 * by a job worker and a message intermediate throw event, none of them
 * multi-instance, and on a start event directly under the process.
 */
export const EXECUTION_LISTENER_GROUP = 'zenbpm-executionListener';

export type ListenerEventType = 'start' | 'end';

export interface DesignedListener {
  eventType: ListenerEventType;
  type: string;
  retries?: string;
}

/** The entry of a field of the listener at the position among the element's listeners. */
export function listenerEntry(elementId: string, index: number, field: 'eventType' | 'type' | 'retries'): string {
  return `${elementId}-zenbpm-executionListener-${index}-${field}`;
}

/**
 * Creates one more listener on the selected element, behind the ones it has,
 * and enters its fields. Answers the listener's position among them.
 */
export async function addListener(page: Page, elementId: string, listener: DesignedListener): Promise<number> {
  const group = await openGroup(page, EXECUTION_LISTENER_GROUP);
  const index = await group.locator('.bio-properties-panel-collapsible-entry').count();
  await group.getByTitle('Create new list item').click();

  const eventType = entry(page, listenerEntry(elementId, index, 'eventType')).getByRole('combobox');
  // the panel opens the listener it has just created
  await expect(eventType).toBeVisible();
  if (await eventType.inputValue() !== listener.eventType) {
    const savedXml = () => page.evaluate(() => localStorage.getItem('process-designer-unsaved-changes'));
    const before = await savedXml();
    await eventType.selectOption(listener.eventType);
    // as for a text entry, the next edit waits for this one to reach the model
    await expect.poll(savedXml, { message: `Persists the event type of listener ${index}`, intervals: [50, 100, 250] }).not.toBe(before);
  }
  await expect(eventType).toHaveValue(listener.eventType);
  await fillEntry(page, listenerEntry(elementId, index, 'type'), listener.type);
  if (listener.retries !== undefined) await fillEntry(page, listenerEntry(elementId, index, 'retries'), listener.retries);
  return index;
}

/** The element's listeners in the XML, in the order of the model, which is the order the engine runs them in. */
export async function expectListenersXml(page: Page, xml: string, elementId: string, expected: DesignedListener[]): Promise<void> {
  await expectXmlElements(
    page,
    xml,
    `[id="${elementId}"] executionListeners > executionListener`,
    expected.map((listener) => ({
      name: 'executionListener',
      attributes: {
        eventType: listener.eventType,
        type: listener.type,
        ...(listener.retries !== undefined ? { retries: listener.retries } : {}),
      },
    })),
  );
}
