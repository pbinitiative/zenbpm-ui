/**
 * Formats a date string for display in metadata fields
 */
export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return dateString;
  }
}

/**
 * Formats a duration between two ISO date strings as a compact, human-readable
 * string with the largest non-zero units first, e.g. `15d 1h 33m 12ms`.
 *
 * Units used: `d` (days), `h` (hours), `m` (minutes), `s` (seconds), `ms` (ms).
 * Zero-valued units are omitted; a zero/negative duration returns `'-'`.
 *
 * Returns `'-'` for invalid input or when the end is not after the start.
 */
export function formatDuration(start: string, end: string): string {
  try {
    const startMs = new Date(start).getTime();
    const endMs = new Date(end).getTime();
    if (Number.isNaN(startMs) || Number.isNaN(endMs)) return '-';
    return formatDurationMs(endMs - startMs);
  } catch {
    return '-';
  }
}

/**
 * Formats a duration in milliseconds as a compact, human-readable string with
 * the largest non-zero units first, e.g. `15d 1h 33m 12ms`.
 *
 * Units used: `d` (days), `h` (hours), `m` (minutes), `s` (seconds), `ms` (ms).
 * Zero-valued units are omitted; a zero/negative duration returns `'-'`.
 */
export function formatDurationMs(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '-';

  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const milliseconds = ms % 1000;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0) parts.push(`${seconds}s`);
  if (milliseconds > 0) parts.push(`${milliseconds}ms`);

  // Round-trip safety: parts could be empty if the duration is in the (0, 1) ms
  // range and got floored to 0 by an upstream caller. Surface that as `-`
  // rather than an empty string.
  return parts.length > 0 ? parts.join(' ') : '-';
}
