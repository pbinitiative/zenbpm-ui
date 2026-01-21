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

// For parsing API responses: store big integers as strings for safe handling in React
// storeAsString: converts integers that exceed MAX_SAFE_INTEGER to strings
const JSONBigParse = JSONBigInt({ storeAsString: true });

// For stringifying mock data: use native BigInt which serializes as JSON numbers
const JSONBigStringify = JSONBigInt({ useNativeBigInt: true });

/**
 * Fields that contain int64 keys and should be serialized as JSON numbers.
 */
const INT64_KEY_FIELDS = new Set([
  'key',
  'processDefinitionKey',
  'processInstanceKey',
  'elementInstanceKey',
  'dmnResourceDefinitionKey',
  'decisionInstanceKey',
  'decisionRequirementsKey',
  'jobKey',
  'incidentKey',
]);

/**
 * Recursively convert string keys to BigInt for proper JSON serialization.
 * This allows mock data to store keys as strings while serializing them as JSON numbers.
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
      if (INT64_KEY_FIELDS.has(key) && typeof value === 'string' && /^\d+$/.test(value)) {
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

/**
 * Parse JSON string, converting large integers to strings to preserve precision.
 * Use this for API response parsing.
 */
export const parse = (text: string): unknown => {
  return JSONBigParse.parse(text);
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
