import { test, expect } from '@playwright/test';
// Import the plain modules, not the VersionSelector index: it also exports the
// React components, whose i18n JSON imports Playwright's Node loader can't load
import { getLatestVersionKey } from '../../src/components/VersionSelector/utils';
import {
  fetchAllVersions,
  VERSION_MAX_PAGES,
  VERSION_PAGE_SIZE,
} from '../../src/components/VersionSelector/fetchAllVersions';

// Pure functions: these tests need no browser page

type Version = { key: string; version: number };

const permutations = <T>(items: T[]): T[][] =>
  items.length <= 1
    ? [items]
    : items.flatMap((item, i) =>
        permutations([...items.slice(0, i), ...items.slice(i + 1)]).map((rest) => [item, ...rest]),
      );

test.describe('getLatestVersionKey', () => {
  test('returns undefined for no versions', () => {
    expect(getLatestVersionKey([])).toBeUndefined();
  });

  test('picks the highest version whatever the order', () => {
    const versions = [
      { key: 'a', version: 2 },
      { key: 'b', version: 10 },
      { key: 'c', version: 1 },
    ];
    for (const order of permutations(versions)) {
      expect(getLatestVersionKey(order)).toBe('b');
    }
  });

  test('compares versions as numbers and keeps int64 keys as strings', () => {
    expect(
      getLatestVersionKey([
        { key: '9007199254740993001', version: 2 },
        { key: '9007199254740993002', version: 10 },
      ]),
    ).toBe('9007199254740993002');
  });
});

/** A paged endpoint over `total` versions, oldest first unless `newestFirst` */
function pagedEndpoint(total: number, { newestFirst = true } = {}) {
  const all: Version[] = Array.from({ length: total }, (_, i) => ({ key: `k${i + 1}`, version: i + 1 }));
  if (newestFirst) all.reverse();
  const requestedPages: number[] = [];
  const fetchPage = (page: number, size: number) => {
    requestedPages.push(page);
    return Promise.resolve({ items: all.slice((page - 1) * size, page * size), totalCount: total });
  };
  return { fetchPage, requestedPages };
}

test.describe('fetchAllVersions', () => {
  test('loads a single page with one request', async () => {
    const { fetchPage, requestedPages } = pagedEndpoint(3);
    const versions = await fetchAllVersions(fetchPage);
    expect(versions.map((v) => v.version)).toEqual([3, 2, 1]);
    expect(requestedPages).toEqual([1]);
  });

  test('loads every page of a long history, newest first', async () => {
    const { fetchPage, requestedPages } = pagedEndpoint(2 * VERSION_PAGE_SIZE + 1, { newestFirst: false });
    const versions = await fetchAllVersions(fetchPage);
    expect(versions).toHaveLength(2 * VERSION_PAGE_SIZE + 1);
    expect(versions[0].version).toBe(2 * VERSION_PAGE_SIZE + 1);
    expect(versions.at(-1)?.version).toBe(1);
    expect(requestedPages).toEqual([1, 2, 3]);
  });

  test('stops after the page that reaches totalCount', async () => {
    const { fetchPage, requestedPages } = pagedEndpoint(2 * VERSION_PAGE_SIZE);
    await fetchAllVersions(fetchPage);
    expect(requestedPages).toEqual([1, 2]);
  });

  test('drops a version repeated when a deployment shifts the pages', async () => {
    const first = Array.from({ length: VERSION_PAGE_SIZE }, (_, i) => ({
      key: `k${VERSION_PAGE_SIZE + 1 - i}`,
      version: VERSION_PAGE_SIZE + 1 - i,
    }));
    // A new version was deployed between the two requests: the last item of
    // page 1 reappears at the top of page 2
    const second = [first.at(-1)!, { key: 'k1', version: 1 }];
    const pages = [first, second];
    const versions = await fetchAllVersions((page) =>
      Promise.resolve({ items: pages[page - 1] ?? [], totalCount: VERSION_PAGE_SIZE + 2 }),
    );
    expect(versions).toHaveLength(VERSION_PAGE_SIZE + 1);
    expect(new Set(versions.map((v) => v.key)).size).toBe(VERSION_PAGE_SIZE + 1);
  });

  test('stops at the page limit', async () => {
    const { fetchPage, requestedPages } = pagedEndpoint((VERSION_MAX_PAGES + 1) * VERSION_PAGE_SIZE);
    const versions = await fetchAllVersions(fetchPage);
    expect(requestedPages).toHaveLength(VERSION_MAX_PAGES);
    // Requested newest first, so the latest version is still among them
    expect(versions[0].version).toBe((VERSION_MAX_PAGES + 1) * VERSION_PAGE_SIZE);
  });

  test('propagates a failed request', async () => {
    await expect(fetchAllVersions(() => Promise.reject(new Error('boom')))).rejects.toThrow('boom');
  });
});
