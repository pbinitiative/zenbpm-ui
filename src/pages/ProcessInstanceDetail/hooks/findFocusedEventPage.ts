import {
  getProcessInstanceErrorSubscriptions,
  getProcessInstanceMessageSubscriptions,
  getProcessInstanceTimerSubscriptions,
} from '@base/openapi';
import type { EventSubscriptionState } from '@base/openapi/generated-api/schemas/eventSubscriptionState';

export type FocusedEventType = 'messages' | 'timers' | 'errors';

/**
 * State filter applied to an event-subscription table. `'all'` means no
 * server-side state filter — subscriptions in every state are listed.
 */
export type EventSubscriptionFilterState = EventSubscriptionState | 'all';

/** Convert a UI filter state to the optional `state` query parameter of the API. */
export const toEventSubscriptionApiState = (
  state: EventSubscriptionFilterState,
): EventSubscriptionState | undefined => (state === 'all' ? undefined : state);

interface EventSearchConfig {
  type: FocusedEventType;
  pageSize: number;
  totalCount?: number;
  state: EventSubscriptionFilterState;
}

interface FindFocusedEventPageOptions {
  processInstanceKey: string;
  elementInstanceKey: string;
  searches: EventSearchConfig[];
  signal?: AbortSignal;
}

export interface FocusedEventPage {
  type: FocusedEventType;
  state: EventSubscriptionFilterState;
  page: number;
}

const fetchers = {
  messages: getProcessInstanceMessageSubscriptions,
  timers: getProcessInstanceTimerSubscriptions,
  errors: getProcessInstanceErrorSubscriptions,
};

/** Search event categories and pages sequentially, returning the first exact match. */
export async function findFocusedEventPage({
  processInstanceKey,
  elementInstanceKey,
  searches,
  signal,
}: FindFocusedEventPageOptions): Promise<FocusedEventPage | undefined> {
  for (const search of searches) {
    if (search.pageSize <= 0) continue;
    // Unknown/zero totals still require checking the first page because counts in
    // the instance tree only describe the state filter that is currently displayed.
    let totalPages = Math.max(1, Math.ceil((search.totalCount ?? 0) / search.pageSize));

    for (let page = 1; page <= totalPages; page++) {
      const response = await fetchers[search.type](
        processInstanceKey,
        { state: toEventSubscriptionApiState(search.state), page, size: search.pageSize },
        undefined,
        signal
      );

      if (response.items?.some((item) => item.elementInstanceKey === elementInstanceKey)) {
        return { type: search.type, state: search.state, page: page - 1 };
      }

      if (response.totalCount !== undefined) {
        totalPages = Math.ceil(response.totalCount / search.pageSize);
      }
    }
  }

  return undefined;
}
