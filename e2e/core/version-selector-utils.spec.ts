import { test, expect } from '@playwright/test';
// Import the plain helpers, not the VersionSelector index: it also exports the
// React components, whose i18n JSON imports Playwright's Node loader can't load
import {
  getLatestVersionKey,
  getNextVersionPage,
  mergeVersionPages,
  resolveLatestKey,
  VERSION_PAGE_SIZE,
  versionPageParams,
  withSelectedOption,
} from '../../src/components/VersionSelector/utils';

// Pure functions: these tests need no browser page

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

/** `count` versions, newest first, ending at version `last` */
const versionsPage = (last: number, count: number, totalCount?: number) => ({
  items: Array.from({ length: count }, (_, i) => ({ key: `k${last - i}`, version: last - i })),
  totalCount,
});

test.describe('versionPageParams', () => {
  test('requests full pages, newest first', () => {
    expect(versionPageParams(3)).toEqual({ page: 3, size: VERSION_PAGE_SIZE, sortBy: 'version', sortOrder: 'desc' });
  });
});

test.describe('getNextVersionPage', () => {
  test('stops after a single page holding every version', () => {
    const page = versionsPage(3, 3, 3);
    expect(getNextVersionPage(page, [page], 1)).toBeUndefined();
  });

  test('continues until the pages hold totalCount items', () => {
    const total = 2 * VERSION_PAGE_SIZE + 1;
    const first = versionsPage(total, VERSION_PAGE_SIZE, total);
    const second = versionsPage(total - VERSION_PAGE_SIZE, VERSION_PAGE_SIZE, total);
    const third = versionsPage(1, 1, total);
    expect(getNextVersionPage(first, [first], 1)).toBe(2);
    expect(getNextVersionPage(second, [first, second], 2)).toBe(3);
    expect(getNextVersionPage(third, [first, second, third], 3)).toBeUndefined();
  });

  test('stops at a page reaching totalCount exactly', () => {
    const first = versionsPage(2 * VERSION_PAGE_SIZE, VERSION_PAGE_SIZE, 2 * VERSION_PAGE_SIZE);
    const second = versionsPage(VERSION_PAGE_SIZE, VERSION_PAGE_SIZE, 2 * VERSION_PAGE_SIZE);
    expect(getNextVersionPage(second, [first, second], 2)).toBeUndefined();
  });

  test('counts the items received when the server returns smaller pages than requested', () => {
    const first = versionsPage(120, 50, 120);
    const second = versionsPage(70, 50, 120);
    expect(getNextVersionPage(first, [first], 1)).toBe(2);
    expect(getNextVersionPage(second, [first, second], 2)).toBe(3);
  });

  test('stops at an empty page, and at a short page without totalCount', () => {
    const empty = { items: [], totalCount: 500 };
    expect(getNextVersionPage(empty, [empty], 4)).toBeUndefined();
    const short = versionsPage(5, 5);
    expect(getNextVersionPage(short, [short], 1)).toBeUndefined();
    const full = versionsPage(500, VERSION_PAGE_SIZE);
    expect(getNextVersionPage(full, [full], 1)).toBe(2);
  });
});

test.describe('mergeVersionPages', () => {
  test('returns the versions newest first, whatever the page order', () => {
    const merged = mergeVersionPages([
      { items: [{ key: 'k1', version: 1 }, { key: 'k3', version: 3 }] },
      { items: [{ key: 'k2', version: 2 }] },
    ]);
    expect(merged.map((v) => v.version)).toEqual([3, 2, 1]);
  });

  test('drops a version repeated when a deployment shifts the pages', () => {
    const first = versionsPage(VERSION_PAGE_SIZE + 1, VERSION_PAGE_SIZE);
    // A new version was deployed between the two requests: the last item of
    // page 1 reappears at the top of page 2
    const second = { items: [first.items.at(-1)!, { key: 'k1', version: 1 }] };
    const merged = mergeVersionPages([first, second]);
    expect(merged).toHaveLength(VERSION_PAGE_SIZE + 1);
    expect(new Set(merged.map((v) => v.key)).size).toBe(VERSION_PAGE_SIZE + 1);
  });

  test('makes keys strings, which the JSON parser leaves numbers up to 15 digits', () => {
    const merged = mergeVersionPages([
      { items: [{ key: 123456789012345 as unknown as string, version: 1, versionTag: 'release-1' }] },
    ]);
    expect(merged).toEqual([{ key: '123456789012345', version: 1, versionTag: 'release-1' }]);
  });
});

test.describe('withSelectedOption', () => {
  const options = [
    { key: 'k3', version: 3 },
    { key: 'k2', version: 2 },
  ];

  test('adds a selected version the options lack, in version order', () => {
    expect(withSelectedOption(options, { key: 'k1', version: 1 }).map((o) => o.key)).toEqual(['k3', 'k2', 'k1']);
    expect(withSelectedOption([{ key: 'k1', version: 1 }], { key: 'k5', version: 5 }).map((o) => o.key)).toEqual(['k5', 'k1']);
  });

  test('keeps the options as they are when they hold the selected version', () => {
    expect(withSelectedOption(options, { key: 'k2', version: 2 })).toBe(options);
    expect(withSelectedOption(options)).toBe(options);
  });

  test('matches a numeric key with its string', () => {
    const numericKey = [{ key: 123456789012345 as unknown as string, version: 1 }];
    expect(withSelectedOption(numericKey, { key: '123456789012345', version: 1 })).toBe(numericKey);
  });
});

test.describe('resolveLatestKey', () => {
  const versions = [
    { key: 'k3', version: 3 },
    { key: 'k2', version: 2 },
  ];

  test('keeps the latest of the list when the selected version is in it or older', () => {
    expect(resolveLatestKey('k3', versions, { key: 'k2', version: 2 })).toBe('k3');
    expect(resolveLatestKey('k3', versions, { key: 'k1', version: 1 })).toBe('k3');
    expect(resolveLatestKey('k3', versions)).toBe('k3');
  });

  test('takes a selected version newer than the list, which is then out of date', () => {
    expect(resolveLatestKey('k3', versions, { key: 'k4', version: 4 })).toBe('k4');
  });

  test('stays unknown while the list is', () => {
    expect(resolveLatestKey(undefined, versions, { key: 'k4', version: 4 })).toBeUndefined();
    expect(resolveLatestKey(undefined, [], { key: 'k1', version: 1 })).toBeUndefined();
  });
});
