import type { TimeUnit } from '../types';

/**
 * Calculate a date relative to now
 */
export function getRelativeTime(amount: number, unit: TimeUnit, direction: 'past' | 'future'): Date {
  const now = new Date();
  const multiplier = direction === 'past' ? -1 : 1;

  switch (unit) {
    case 'minutes':
      return new Date(now.getTime() + multiplier * amount * 60 * 1000);
    case 'hours':
      return new Date(now.getTime() + multiplier * amount * 60 * 60 * 1000);
    case 'days':
      return new Date(now.getTime() + multiplier * amount * 24 * 60 * 60 * 1000);
    case 'weeks':
      return new Date(now.getTime() + multiplier * amount * 7 * 24 * 60 * 60 * 1000);
    case 'months': {
      const result = new Date(now);
      result.setMonth(result.getMonth() + multiplier * amount);
      return result;
    }
    default:
      return now;
  }
}
