/**
 * Convert a Date to the format required by datetime-local input (local time)
 * Format: YYYY-MM-DDTHH:MM
 */
export function dateToLocalInput(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * Convert an ISO string to the format required by datetime-local input (local time)
 * @param isoString - ISO 8601 date string (e.g., "2024-01-15T15:30:00.000Z")
 * @returns Local datetime string for input (e.g., "2024-01-15T10:30" in UTC-5)
 */
export function isoToLocalInput(isoString: string | undefined): string {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '';
    return dateToLocalInput(date);
  } catch {
    return '';
  }
}

/**
 * Convert datetime-local input value to ISO 8601 string
 * Interprets the input as local time and converts to UTC
 * @param localInput - Local datetime string from input (e.g., "2024-01-15T10:30")
 * @returns ISO 8601 string (e.g., "2024-01-15T15:30:00.000Z" in UTC-5)
 */
export function localInputToISO(localInput: string): string | undefined {
  if (!localInput) return undefined;
  try {
    // datetime-local format is interpreted as local time by Date constructor
    const date = new Date(localInput);
    if (isNaN(date.getTime())) return undefined;
    return date.toISOString();
  } catch {
    return undefined;
  }
}

/**
 * Convert a Date to ISO 8601 string
 */
export function dateToISO(date: Date): string {
  return date.toISOString();
}

/**
 * Format datetime for display (accepts ISO string)
 */
export function formatDisplayDateTime(isoString: string | undefined): string {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}
