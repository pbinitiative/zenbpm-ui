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
}

/** Failures in effect. Tests change this array through `window.__mockFailures`. */
export const mockFailures: MockFailure[] = [];

/** The failure configured for `url`, if any */
export const findMockFailure = (url: URL): MockFailure | undefined =>
  mockFailures.find(
    (failure) =>
      url.pathname === failure.path &&
      Object.entries(failure.params ?? {}).every(([name, value]) => url.searchParams.get(name) === value),
  );

if (typeof window !== 'undefined') {
  (window as unknown as { __mockFailures: MockFailure[] }).__mockFailures = mockFailures;
}
