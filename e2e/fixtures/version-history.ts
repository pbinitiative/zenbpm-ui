import type { Page } from '@playwright/test';
import type { MockFailure } from '../../src/mocks/failures';

/** The list endpoint and filter parameter of a definition type's versions */
const VERSION_LISTS = {
  process: { path: '/v1/process-definitions', idParam: 'bpmnProcessId' },
  decision: { path: '/v1/dmn-resource-definitions', idParam: 'dmnResourceDefinitionId' },
} as const;

export type DefinitionType = keyof typeof VERSION_LISTS;

/**
 * Records the pages of the version list of definition `id` that the app
 * requests. Call `settle` before asserting that a request was *not* made.
 */
export function trackVersionPageRequests(page: Page, type: DefinitionType, id: string) {
  const { path, idParam } = VERSION_LISTS[type];
  const pages: number[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.pathname === path && url.searchParams.get(idParam) === id) {
      pages.push(Number(url.searchParams.get('page')));
    }
  });

  /**
   * Waits until every request the app started so far is recorded: the
   * browser reports requests in the order they start, so once a request
   * started now is reported, the earlier ones are too.
   */
  const settle = async () => {
    const barrierId = `__barrier_${Date.now()}_${Math.random()}`;
    const barrier = page.waitForRequest((request) => new URL(request.url()).searchParams.get(idParam) === barrierId);
    await page.evaluate(
      ({ path, idParam, barrierId }) => {
        void fetch(`${path}?${idParam}=${barrierId}&page=1&size=1`);
      },
      { path, idParam, barrierId },
    );
    await barrier;
  };

  return { pages, settle };
}

/** Makes the mocks answer the matching requests with an error status, until cleared */
export async function failMockRequests(page: Page, failure: MockFailure) {
  await page.evaluate((failure) => {
    (window as unknown as { __mockFailures: MockFailure[] }).__mockFailures.push(failure);
  }, failure);
}

export async function clearMockFailures(page: Page) {
  await page.evaluate(() => {
    (window as unknown as { __mockFailures: MockFailure[] }).__mockFailures.length = 0;
  });
}

/** The params selecting the version list of definition `id` */
export const versionListFailure = (type: DefinitionType, id: string, status = 503, page?: number): MockFailure => ({
  path: VERSION_LISTS[type].path,
  params: { [VERSION_LISTS[type].idParam]: id, ...(page !== undefined && { page: String(page) }) },
  status,
});

/**
 * Navigates within the app, like a router link: the query cache and the
 * changed mock data survive, unlike with `page.goto`
 */
export async function navigateInApp(page: Page, path: string) {
  await page.evaluate((path) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, path);
}

/** Scrolls the open version menu to its end, which loads the next page of older versions */
export async function scrollVersionMenuToEnd(page: Page) {
  await page.locator('.MuiMenu-paper').evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
}
