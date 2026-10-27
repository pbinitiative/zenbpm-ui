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
 * validator expects, leaving the counters integers. `name` is the property or
 * parameter `root` belongs to, if any.
 */
export function retypeInt64KeysToString(root: unknown, name?: string): Int64Classification;

/**
 * Calls `visit` with every inline schema of `paths` the Orval transformer
 * retypes: request and response bodies, and parameters with their name.
 */
export function forEachInlineSchema<Schema = unknown>(
  paths: unknown,
  visit: (schema: Schema | undefined, name?: string) => void
): void;

/**
 * Classifies the int64 fields of the inline schemas of `paths`, as the Orval
 * transformer retypes them, without changing `paths`.
 */
export function classifyInt64OfPaths(paths: unknown): Int64Classification;

/**
 * Checks the classifications of one spec: the listed counters which no int64
 * property matched, and the keys not named like one.
 */
export function checkInt64Classification(...classifications: Int64Classification[]): {
  unmatchedCounters: string[];
  keysNotNamedLikeKeys: string[];
};
