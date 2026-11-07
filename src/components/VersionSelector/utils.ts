// Pure helpers, without `@`-alias imports, so that tests can import them directly

/** The list endpoints' maximum page size */
export const VERSION_PAGE_SIZE = 100;

interface Versioned {
  key: string;
  version: number;
}

/** One page of a definition's version list, as the list endpoints return it */
export interface VersionsPage<T> {
  items?: T[];
  totalCount?: number;
}

/**
 * Query parameters for one page of a definition's version list. Requesting
 * newest first puts the latest version on the first page.
 */
export const versionPageParams = (page: number) =>
  ({ page, size: VERSION_PAGE_SIZE, sortBy: 'version', sortOrder: 'desc' }) as const;

/**
 * Key of the highest-numbered version, regardless of the list order or which
 * version is selected. Undefined when the list is empty.
 */
export function getLatestVersionKey(versions: Versioned[]): string | undefined {
  let latest: Versioned | undefined;
  for (const v of versions) {
    if (!latest || v.version > latest.version) {
      latest = v;
    }
  }
  return latest?.key;
}

/**
 * The versions of the loaded pages, newest first, without duplicates (a
 * deployment made while paging shifts the following pages by one). Keys are
 * strings: the JSON parser keeps int64 values of up to 15 digits as numbers.
 */
export function mergeVersionPages<T extends Versioned>(pages: VersionsPage<T>[]): T[] {
  const byKey = new Map<string, T>();
  for (const { items = [] } of pages) {
    for (const item of items) {
      const key = String(item.key);
      byKey.set(key, { ...item, key });
    }
  }
  return [...byKey.values()].sort((a, b) => b.version - a.version);
}

/**
 * Number of the page to load after `lastPageParam`, or undefined once the
 * pages hold `totalCount` items. Counts the items received, so a server
 * returning smaller pages than requested is still read to the end.
 */
export function getNextVersionPage<P extends VersionsPage<unknown>>(
  lastPage: P,
  allPages: P[],
  lastPageParam: number,
): number | undefined {
  if (!lastPage.items?.length) return undefined;
  const received = allPages.reduce((count, page) => count + (page.items?.length ?? 0), 0);
  if (lastPage.totalCount !== undefined) {
    return received < lastPage.totalCount ? lastPageParam + 1 : undefined;
  }
  return lastPage.items.length < VERSION_PAGE_SIZE ? undefined : lastPageParam + 1;
}

/**
 * `options` with `selected` added in version order when they lack it, so
 * that the selected version shows before its page is loaded.
 */
export function withSelectedOption<T extends Versioned>(options: T[], selected?: T): T[] {
  if (!selected || options.some((o) => String(o.key) === String(selected.key))) return options;
  return [...options, selected].sort((a, b) => b.version - a.version);
}

/**
 * `latestKey`, unless `selected` has a higher version than it: the list
 * `latestKey` comes from is then older than `selected`, which is the latest
 * version known. Undefined while `latestKey` is.
 */
export function resolveLatestKey<T extends Versioned>(
  latestKey: string | undefined,
  versions: T[],
  selected?: T,
): string | undefined {
  if (latestKey === undefined) return undefined;
  const latest = versions.find((v) => String(v.key) === latestKey);
  return selected && latest && selected.version > latest.version ? String(selected.key) : latestKey;
}
