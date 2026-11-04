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
 * while paging shifts the following pages by one). Only a failure of the
 * first page rejects: if a later page fails, the newer versions already
 * loaded are returned, which still include the latest one.
 */
export async function fetchAllVersions<T extends { key: string | number; version: number }>(
  fetchPage: (page: number, size: number) => Promise<VersionsPage<T>>,
): Promise<T[]> {
  const byKey = new Map<string, T>();

  for (let page = 1; page <= VERSION_MAX_PAGES; page += 1) {
    let response: VersionsPage<T>;
    try {
      response = await fetchPage(page, VERSION_PAGE_SIZE);
    } catch (err) {
      if (page === 1) throw err;
      console.error(`Failed to load versions page ${page}; showing the newer ones loaded:`, err);
      break;
    }
    const { items = [], totalCount } = response;
    for (const item of items) {
      byKey.set(String(item.key), item);
    }
    const loadedEverything = totalCount !== undefined && page * VERSION_PAGE_SIZE >= totalCount;
    if (items.length < VERSION_PAGE_SIZE || loadedEverything) break;
  }

  return [...byKey.values()].sort((a, b) => b.version - a.version);
}
