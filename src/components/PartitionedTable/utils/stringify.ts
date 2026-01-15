/**
 * Safely stringify any value for table cell display
 */
export const stringify = (val: unknown): string => {
  if (val === null || val === undefined) return '';
  if (typeof val === 'object') return JSON.stringify(val);
  if (typeof val === 'string') return val;
  if (typeof val === 'number' || typeof val === 'boolean' || typeof val === 'bigint') {
    return val.toString();
  }
  if (typeof val === 'symbol') return val.toString();
  if (typeof val === 'function') return '[Function]';
  return '';
};
