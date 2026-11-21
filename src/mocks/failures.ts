// Failures the mocks inject on request, for tests. No imports, so that e2e
// specs can import the types.

/**
 * A request the mocks answer with an error status instead of data, so that
 * tests can exercise failures. Matches the requests to `path` whose query
 * has every one of `params`, whatever their method.
 */
export interface MockFailure {
  path: string;
  params?: Record<string, string>;
  status: number;
  /** How many requests the failure answers before it ends; without it, every one until it is removed. */
  times?: number;
}

/** Failures in effect. Tests change this array through `window.__mockFailures`. */
export const mockFailures: MockFailure[] = [];

/** The failure configured for `url`, if any; one which answers a number of requests counts this one */
export const findMockFailure = (url: URL): MockFailure | undefined => {
  const failure = mockFailures.find(
    (candidate) =>
      url.pathname === candidate.path &&
      Object.entries(candidate.params ?? {}).every(([name, value]) => url.searchParams.get(name) === value),
  );
  if (failure?.times !== undefined && --failure.times <= 0) {
    mockFailures.splice(mockFailures.indexOf(failure), 1);
  }
  return failure;
};

if (typeof window !== 'undefined') {
  (window as unknown as { __mockFailures: MockFailure[] }).__mockFailures = mockFailures;
}
