/**
 * Names of the int64 properties which are numeric counters, not keys.
 */
export const INT64_COUNTER_FIELDS: ReadonlySet<string>;

/**
 * Whether `schema` describes an int64 key. `name` is the property or parameter
 * the schema belongs to, if any.
 */
export function isInt64Key(schema: { type?: unknown; format?: unknown }, name?: string): boolean;

/**
 * Names of the properties which an int64 classification found to be keys and
 * counters. `undefined` stands for a schema of no property.
 */
export interface Int64Classification {
  keys: Set<string | undefined>;
  counters: Set<string | undefined>;
}

/**
 * Rewrites the int64 keys under `root` into the key strings the runtime
 * validator expects, leaving the counters integers.
 */
export function retypeInt64KeysToString(root: unknown): Int64Classification;

/**
 * Checks a classification made by `retypeInt64KeysToString`: the listed
 * counters which no int64 property matched, and the keys not named like one.
 */
export function checkInt64Classification(classification: Int64Classification): {
  unmatchedCounters: string[];
  keysNotNamedLikeKeys: string[];
};
