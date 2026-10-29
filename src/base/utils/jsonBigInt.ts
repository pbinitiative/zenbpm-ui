/**
 * JSON utilities for handling int64 (BigInt) values.
 *
 * JavaScript's Number type loses precision for integers > 2^53-1 (MAX_SAFE_INTEGER).
 * The backend API sends int64 keys as JSON numbers, which would lose precision
 * when parsed with standard JSON.parse().
 *
 * This module uses json-bigint to:
 * - Parse large integers as strings (preserving precision for frontend use)
 * - Stringify bigint values as JSON numbers (for API/mock compatibility)
 */
import JSONBigInt from 'json-bigint';
import { freeFormFields } from '@base/openapi/generated-api/free-form-fields';
import { int64CounterFields, int64KeyFields } from '@base/openapi/generated-api/int64-fields';

// For parsing API responses: store big integers as strings for safe handling in React
// storeAsString: converts numbers of more than 15 characters to strings
const JSONBigParse = JSONBigInt({ storeAsString: true });

// Converts those numbers to BigNumber instead, which tells them from JSON strings
const JSONBigNumberParse = JSONBigInt();

// For stringifying mock data: use native BigInt which serializes as JSON numbers
const JSONBigStringify = JSONBigInt({ useNativeBigInt: true });

/**
 * Fields that contain int64 keys and should be serialized as JSON numbers:
 * every int64 property and parameter of the spec which is not a counter, as
 * `scripts/openapi-int64.mjs` classifies them.
 *
 * The names are matched wherever they occur, except inside free-form fields.
 */
const INT64_KEY_FIELDS: ReadonlySet<string> = new Set(int64KeyFields);

/**
 * Fields that contain int64 counters such as `deliveryToken`. Their generated
 * type is `number`, which serializes as a JSON number anyway. json-bigint parses
 * a counter of more than 15 digits into a string, so the response parser turns
 * it back into a number up to Number.MAX_SAFE_INTEGER. A larger one stays a
 * string, which the validator refuses.
 *
 * The names are matched wherever they occur, except inside free-form fields.
 */
const INT64_COUNTER_FIELDS: ReadonlySet<string> = new Set(int64CounterFields);

/**
 * Free-form fields, such as variables, decision outputs and task headers, as
 * `scripts/openapi-free-form.mjs` classifies them. Their content is named and
 * typed by the process, not by the API: a variable called `jobKey` or
 * `deliveryToken` holding `"00123"` must stay that string.
 */
const FREE_FORM_FIELDS: ReadonlySet<string> = new Set(freeFormFields);

/**
 * Recursively convert string keys to BigInt for proper JSON serialization.
 * This allows mock data to store keys as strings while serializing them as JSON numbers.
 * Free-form fields are passed through untouched.
 */
function convertKeysToBigInt(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(convertKeysToBigInt);
  }

  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (FREE_FORM_FIELDS.has(key)) {
        result[key] = value;
      } else if (INT64_KEY_FIELDS.has(key) && typeof value === 'string' && /^\d+$/.test(value)) {
        // Convert string key to BigInt for JSON number serialization
        result[key] = BigInt(value);
      } else {
        result[key] = convertKeysToBigInt(value);
      }
    }
    return result;
  }

  return obj;
}

type Path = Array<string | number>;

/**
 * Paths of the int64 counters holding a string of more than 15 digits: a number
 * which json-bigint parsed into a string, or a JSON string. Free-form fields are
 * not searched.
 */
function findLongCounters(obj: unknown, path: Path = [], found: Path[] = []): Path[] {
  if (Array.isArray(obj)) {
    obj.forEach((item, index) => findLongCounters(item, [...path, index], found));
  } else if (obj !== null && typeof obj === 'object') {
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (INT64_COUNTER_FIELDS.has(key) && typeof value === 'string' && /^\d{16,}$/.test(value)) {
        found.push([...path, key]);
      } else if (!FREE_FORM_FIELDS.has(key)) {
        findLongCounters(value, [...path, key], found);
      }
    }
  }
  return found;
}

const valueAt = (root: unknown, path: Path): unknown =>
  path.reduce<unknown>((node, segment) => (node as Record<string | number, unknown>)[segment], root);

/**
 * Turn the int64 counters which json-bigint parsed from numbers into strings
 * back into numbers, as long as a number holds them exactly. Changes `value`,
 * the parsed `text`, in place.
 *
 * A counter which the API sent as a JSON string stays a string, and the
 * validator refuses it. json-bigint parses both into the same string, so `text`
 * is parsed again, with BigNumbers for numbers, to tell them apart. Counters
 * that long hardly occur, so this rarely happens.
 */
function restoreCounters(text: string, value: unknown): void {
  const counters = findLongCounters(value);
  if (counters.length === 0) return;
  const tokens: unknown = JSONBigNumberParse.parse(text);
  for (const path of counters) {
    if (typeof valueAt(tokens, path) === 'string') continue;
    const counter = Number(valueAt(value, path));
    if (Number.isSafeInteger(counter)) {
      const parent = valueAt(value, path.slice(0, -1)) as Record<string, unknown>;
      parent[path[path.length - 1]] = counter;
    }
  }
}

/**
 * Parse JSON string, converting large integers to strings to preserve precision.
 * Int64 counters stay numbers up to Number.MAX_SAFE_INTEGER.
 * Use this for API response parsing.
 */
export const parse = (text: string): unknown => {
  const value: unknown = JSONBigParse.parse(text);
  restoreCounters(text, value);
  return value;
};

/**
 * Stringify a value to JSON, converting BigInt values to JSON numbers.
 * Use this for MSW mock responses.
 */
export const stringify = (value: unknown): string => {
  return JSONBigStringify.stringify(value);
};

/**
 * Stringify mock data to JSON, automatically converting string keys to BigInt
 * so they serialize as JSON numbers (like the real API).
 */
export const stringifyMockData = (value: unknown): string => {
  const converted = convertKeysToBigInt(value);
  return JSONBigStringify.stringify(converted);
};

/**
 * Custom axios response transformer that uses BigInt-aware JSON parsing.
 * Converts large integers to strings for safe handling in JavaScript.
 */
export const axiosResponseTransformer = (data: string): unknown => {
  if (typeof data === 'string') {
    try {
      return parse(data);
    } catch {
      return data;
    }
  }
  return data;
};

/**
 * Custom axios request transformer that converts string int64 keys back to BigInt
 * for proper JSON serialization as numbers when sending to the backend.
 * This reverses the string conversion done by the response transformer.
 */
export const stringifyWithBigInt = (value: unknown): string => {
  const converted = convertKeysToBigInt(value);
  return JSONBigStringify.stringify(converted);
};

export default { parse, stringify, stringifyMockData, stringifyWithBigInt };
