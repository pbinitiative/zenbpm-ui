// ISO-8601 durations of job retry backoffs, read the way the engine reads them:
// weeks, days, hours, minutes and seconds, a day counting 24 hours and a week
// seven days. Years and months are refused because their length depends on the
// date. A duration without any component ("P", "PT") or ending in "T" is refused.
const ISO_BACKOFF = /^P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/;

const SECONDS_PER = { week: 7 * 24 * 60 * 60, day: 24 * 60 * 60, hour: 60 * 60, minute: 60 };

/**
 * Milliseconds of a backoff such as `PT10S` or `P1D`, in whole seconds as the
 * engine keeps them; undefined for anything the engine refuses.
 */
export function parseIsoBackoff(value: string): number | undefined {
  const trimmed = value.trim();
  const match = ISO_BACKOFF.exec(trimmed);
  if (!match || trimmed === 'P' || trimmed.endsWith('T')) return undefined;
  const [, weeks, days, hours, minutes, seconds] = match;
  if ([weeks, days, hours, minutes, seconds].every((part) => part === undefined)) return undefined;
  const total =
    Number(weeks ?? 0) * SECONDS_PER.week +
    Number(days ?? 0) * SECONDS_PER.day +
    Number(hours ?? 0) * SECONDS_PER.hour +
    Number(minutes ?? 0) * SECONDS_PER.minute +
    Math.trunc(Number(seconds ?? 0));
  return Number.isSafeInteger(total * 1000) ? total * 1000 : Number.MAX_SAFE_INTEGER;
}
