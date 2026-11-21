import { expect, type Page, type Request } from '@playwright/test';
import type { MockHold } from '../../src/mocks/holds';

// The mocked engine answers from a service worker, which no network emulation and no `page.route` reaches. A test
// which needs its answers in a certain order says so to the mocks themselves.

/** Keeps the answers to the matching requests back from here on, until `releaseMockAnswers` lets them go. */
export async function holdMockAnswers(page: Page, hold: MockHold) {
  await page.evaluate((hold) => {
    (window as unknown as { __mockHolds: MockHold[] }).__mockHolds.push(hold);
  }, hold);
}

/** Lets the answers of the hold of that name go, or of every hold without a name; later requests are not held. */
export async function releaseMockAnswers(page: Page, name?: string) {
  await page.evaluate((name) => {
    (window as unknown as { __releaseMockHolds: (name?: string) => void }).__releaseMockHolds(name);
  }, name);
}

/** Whether a request asks the engine for that page of the jobs of a process instance, at that many to a page. */
export function isJobsPage(request: Request, processInstanceKey: string, jobsPage: string, size?: string): boolean {
  const url = new URL(request.url());
  return (
    url.pathname === `/v1/process-instances/${processInstanceKey}/jobs` &&
    url.searchParams.get('page') === jobsPage &&
    (size === undefined || url.searchParams.get('size') === size)
  );
}

/**
 * Watches what the page asks the engine for from now on. The function returned waits until every such request has
 * its answer, or was given up, and none has followed for a moment, so that the page shows what those answers made
 * of it. A request the mocks hold back counts as one without an answer.
 */
export function watchRequestsToTheEngine(page: Page): () => Promise<void> {
  const withoutAnswer = new Set<Request>();
  let lastChange = Date.now();
  page.on('request', (request) => {
    if (!new URL(request.url()).pathname.startsWith('/v1/')) return;
    withoutAnswer.add(request);
    lastChange = Date.now();
  });
  const answered = (request: Request) => {
    if (withoutAnswer.delete(request)) lastChange = Date.now();
  };
  page.on('requestfinished', answered);
  page.on('requestfailed', answered);
  return async () => {
    await expect
      .poll(() => withoutAnswer.size === 0 && Date.now() - lastChange >= 500, { timeout: 20000 })
      .toBe(true);
  };
}

/**
 * The page asks for its data anew every few seconds, but only while its browser tab is in view. Out of view, it
 * asks only where what its user does calls for it.
 */
export async function keepFromRefreshing(page: Page) {
  await page.evaluate(() => Object.defineProperty(document, 'hidden', { get: () => true }));
}
