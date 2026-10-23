/**
 * Classification of the API's int64 fields, shared by the Orval transformer
 * (client types) and the validation schema generator.
 *
 * An int64 field is an opaque key unless listed here. Keys exceed
 * Number.MAX_SAFE_INTEGER, so the UI carries them as strings: json-bigint
 * parses them into strings, and the generated types and schemas say `string`.
 *
 * A counter is an int64 in the engine's contract, but stays small: json-bigint
 * leaves it a JavaScript number, so its type and schema keep `integer`.
 */

/**
 * Names of the int64 properties which are numeric counters, not keys.
 *
 * `deliveryToken` counts the deliveries of a job over the job stream: `0` while
 * it was never handed out.
 */
export const INT64_COUNTER_FIELDS = new Set(['deliveryToken']);

/**
 * Whether `schema` describes an int64 key. `name` is the property or parameter
 * the schema belongs to, if any.
 */
export const isInt64Key = (schema, name) =>
  schema.type === 'integer' && schema.format === 'int64' && !INT64_COUNTER_FIELDS.has(name);

// Keywords whose subschemas describe the value of the schema itself
const SAME_VALUE_KEYWORDS = new Set(['allOf', 'oneOf', 'anyOf']);

/**
 * Rewrites the int64 keys under `root` into the key strings the runtime
 * validator expects, leaving the counters integers. A property's name carries
 * over into the members of its `allOf`/`oneOf`/`anyOf` and into its `items`,
 * while the properties of a nested object have names of their own.
 *
 * Returns the names of the properties classified as keys and as counters.
 */
export const retypeInt64KeysToString = (root) => {
  const keys = new Set();
  const counters = new Set();
  const stack = [[root, undefined]];
  while (stack.length > 0) {
    const [schema, name] = stack.pop();
    if (!schema || typeof schema !== 'object') continue;
    if (isInt64Key(schema, name)) {
      schema.type = 'string';
      schema.pattern = '^\\d{15,25}$';
      delete schema.format;
      keys.add(name);
    } else if (schema.type === 'integer' && schema.format === 'int64') {
      counters.add(name);
    }
    for (const [keyword, value] of Object.entries(schema)) {
      if (!value || typeof value !== 'object') continue;
      if (keyword === 'properties') {
        for (const [propertyName, property] of Object.entries(value)) {
          stack.push([property, propertyName]);
        }
      } else if (SAME_VALUE_KEYWORDS.has(keyword) && Array.isArray(value)) {
        for (const member of value) {
          stack.push([member, name]);
        }
      } else if (keyword === 'items') {
        stack.push([value, name]);
      } else {
        stack.push([value, undefined]);
      }
    }
  }
  return { keys, counters };
};

// How keys are named: `key`, `…Key` or `…Token`
const KEY_NAME = /^key$|Key$|Token$/;

/**
 * Checks a classification made by `retypeInt64KeysToString`, since every int64
 * is a key by default: a new counter would silently become a key string.
 *
 * Returns the listed counters which no int64 property matched, because their
 * entry is stale or their schema got a shape the classification does not see,
 * and the keys which are not named like one, which may be unlisted counters.
 */
export const checkInt64Classification = ({ keys, counters }) => ({
  unmatchedCounters: [...INT64_COUNTER_FIELDS].filter((name) => !counters.has(name)),
  keysNotNamedLikeKeys: [...keys].filter((name) => name !== undefined && !KEY_NAME.test(name)),
});
