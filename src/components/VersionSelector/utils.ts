/**
 * Key of the highest-numbered version, regardless of the list order or which
 * version is selected. Undefined when the list is empty.
 */
export function getLatestVersionKey(versions: { key: string; version: number }[]): string | undefined {
  let latest: { key: string; version: number } | undefined;
  for (const v of versions) {
    if (!latest || v.version > latest.version) {
      latest = v;
    }
  }
  return latest?.key;
}
