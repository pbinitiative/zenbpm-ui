// Answers the mocks hold back on request, for tests. No imports, so that e2e
// specs can import the types.

/**
 * Requests the mocks answer only once a test releases them, so that a test
 * decides the order in which answers arrive instead of leaving it to delays.
 * Matches the requests to `path` whose query has every one of `params`,
 * whatever their method.
 */
export interface MockHold {
  /** Names the hold for its release. */
  name: string;
  path: string;
  params?: Record<string, string>;
}

/** Holds in effect. Tests add to this array through `window.__mockHolds`. */
export const mockHolds: MockHold[] = [];

const heldRequests: { hold: MockHold; release: () => void }[] = [];

/**
 * Resolves once the hold which matches `url` is released; at once for a
 * request no hold matches.
 */
export const untilReleased = (url: URL): Promise<void> => {
  const hold = mockHolds.find(
    (candidate) =>
      url.pathname === candidate.path &&
      Object.entries(candidate.params ?? {}).every(([name, value]) => url.searchParams.get(name) === value),
  );
  if (!hold) return Promise.resolve();
  return new Promise((release) => heldRequests.push({ hold, release }));
};

/**
 * Ends the holds of that name, or every hold without one: the requests they
 * held are answered, and later ones are not held any more.
 */
export const releaseMockHolds = (name?: string): void => {
  const ends = (hold: MockHold) => name === undefined || hold.name === name;
  for (let index = mockHolds.length - 1; index >= 0; index--) {
    if (ends(mockHolds[index])) mockHolds.splice(index, 1);
  }
  for (let index = heldRequests.length - 1; index >= 0; index--) {
    if (!ends(heldRequests[index].hold)) continue;
    heldRequests[index].release();
    heldRequests.splice(index, 1);
  }
};

if (typeof window !== 'undefined') {
  (window as unknown as { __mockHolds: MockHold[] }).__mockHolds = mockHolds;
  (window as unknown as { __releaseMockHolds: typeof releaseMockHolds }).__releaseMockHolds = releaseMockHolds;
}
