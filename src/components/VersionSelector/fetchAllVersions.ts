/** The list endpoints' maximum page size */
export const VERSION_PAGE_SIZE = 100;
/** Upper bound on requests for one definition's history (10,000 versions) */
export const VERSION_MAX_PAGES = 100;

interface VersionsPage<T> {
  items?: T[];
  totalCount?: number;
}

/**
 * Loads every version of one definition, page by page, so that the
 * displayed version and the latest one are always among the options.
 * Pass a `fetchPage` that requests newest first: if the history exceeds
 * `VERSION_MAX_PAGES` pages, the versions left out are then the oldest.
 *
 * Returns the versions newest first, without duplicates (a deployment made
 * while paging shifts the following pages by one).
 */
export async function fetchAllVersions<T extends { key: string | number; version: number }>(
  fetchPage: (page: number, size: number) => Promise<VersionsPage<T>>,
): Promise<T[]> {
  const byKey = new Map<string, T>();

  for (let page = 1; page <= VERSION_MAX_PAGES; page += 1) {
    const { items = [], totalCount } = await fetchPage(page, VERSION_PAGE_SIZE);
    for (const item of items) {
      byKey.set(String(item.key), item);
    }
    const loadedEverything = totalCount !== undefined && page * VERSION_PAGE_SIZE >= totalCount;
    if (items.length < VERSION_PAGE_SIZE || loadedEverything) break;
  }

  return [...byKey.values()].sort((a, b) => b.version - a.version);
}
