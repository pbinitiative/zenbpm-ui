/**
 * Classification of the API's int64 fields, shared by the Orval transformer
 * (client types) and the validation schema generator.
 *
 * An int64 field is an opaque key unless listed here. Keys exceed
 * Number.MAX_SAFE_INTEGER, so the UI carries them as strings: json-bigint
 * parses them into strings, and the generated types and schemas say `string`.
 *
 * A counter is an int64 in the engine's contract, but stays small: it is a
 * JavaScript number, so its type and schema keep `integer`. json-bigint turns
 * every integer of more than 15 digits into a string, so the response parser
 * turns a counter back into a number up to Number.MAX_SAFE_INTEGER (see
 * `src/base/utils/jsonBigInt.ts`). A larger counter is not supported: it stays
 * a string, which the validator refuses.
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
const SAME_VALUE_KEYWORDS = ['allOf', 'oneOf', 'anyOf', 'not', 'items'];

/**
 * Calls `visit` with `root` and every subschema under it, together with the
 * name of the property or parameter it belongs to, if any. `name` is the one of
 * `root`. A property's name carries over into its `allOf`/`oneOf`/`anyOf`/`not`
 * and its `items`, while the properties of a nested object have names of their
 * own and the values of a map none. References are not followed.
 *
 * Both generators walk their schemas with it, so that they retype the same.
 */
export const forEachSchema = (root, visit, name) => {
  const stack = [[root, name]];
  while (stack.length > 0) {
    const [schema, name] = stack.pop();
    if (!schema || typeof schema !== 'object' || '$ref' in schema) continue;
    visit(schema, name);
    for (const [propertyName, property] of Object.entries(schema.properties ?? {})) {
      stack.push([property, propertyName]);
    }
    for (const keyword of SAME_VALUE_KEYWORDS) {
      for (const member of [schema[keyword] ?? []].flat()) {
        stack.push([member, name]);
      }
    }
    stack.push([schema.additionalProperties, undefined]);
  }
};

/**
 * Rewrites the int64 keys under `root` into the key strings the runtime
 * validator expects, leaving the counters integers. `name` is the property or
 * parameter `root` belongs to, if any. Adds the names of the properties it
 * classified to `classification`.
 */
const retypeSchema = (root, name, classification) => {
  forEachSchema(
    root,
    (schema, name) => {
      if (isInt64Key(schema, name)) {
        schema.type = 'string';
        schema.pattern = '^\\d{15,25}$';
        delete schema.format;
        classification.keys.add(name);
      } else if (schema.type === 'integer' && schema.format === 'int64') {
        classification.counters.add(name);
      }
    },
    name
  );
};

/**
 * Rewrites the int64 keys of the component `schemas`, a map of schemas by
 * name, into the key strings the runtime validator expects, leaving the
 * counters integers.
 *
 * Returns the names of the properties classified as keys and as counters.
 */
export const retypeInt64KeysToString = (schemas) => {
  const classification = { keys: new Set(), counters: new Set() };
  for (const schema of Object.values(schemas ?? {})) {
    retypeSchema(schema, undefined, classification);
  }
  return classification;
};

const OPERATIONS = ['get', 'post', 'put', 'patch', 'delete'];

/**
 * Calls `visit` with every inline schema of `paths` the Orval transformer
 * retypes: the request and response bodies and the parameters of every
 * operation, a parameter's schema with the parameter's name. Shared by the
 * transformer and `classifyInt64OfPaths`, so that the check covers whatever the
 * client types retype.
 */
export const forEachInlineSchema = (paths, visit) => {
  for (const pathItem of Object.values(paths ?? {})) {
    for (const method of OPERATIONS) {
      const operation = pathItem?.[method];
      if (!operation) continue;
      for (const mediaType of Object.values(operation.requestBody?.content ?? {})) {
        visit(mediaType.schema);
      }
      for (const response of Object.values(operation.responses ?? {})) {
        for (const mediaType of Object.values(response?.content ?? {})) {
          visit(mediaType.schema);
        }
      }
      for (const parameter of operation.parameters ?? []) {
        visit(parameter.schema, parameter.name);
      }
    }
  }
};

/**
 * Classifies the int64 fields of the inline schemas of `paths` as the Orval
 * transformer retypes them (see `forEachInlineSchema`). `paths` stays untouched.
 *
 * The validation schemas leave these schemas out, so a check of their
 * classification alone would miss the counters and keys only the paths have.
 */
export const classifyInt64OfPaths = (paths) => {
  const classification = { keys: new Set(), counters: new Set() };
  forEachInlineSchema(paths, (schema, name) => {
    retypeSchema(structuredClone(schema), name, classification);
  });
  return classification;
};

// How keys are named: `key`, `…Key`, and `…KeyIn` for a filter by keys
const KEY_NAME = /^key$|Key$|KeyIn$/;

/**
 * The int64 keys named otherwise, one by one, since a counter may have a name
 * like theirs: `deliveryToken` would pass for a key as well as `executionToken`.
 */
const KEYS_NOT_NAMED_LIKE_KEYS = new Set(['executionToken']);

/**
 * Checks the classifications made by `retypeInt64KeysToString` and
 * `classifyInt64OfPaths` of one spec, since every int64 is a key by default: a
 * new counter would silently become a key string.
 *
 * Returns the listed counters which no int64 property matched, because their
 * entry is stale or their schema got a shape the classification does not see,
 * and the keys which are neither named like one nor listed in
 * `KEYS_NOT_NAMED_LIKE_KEYS`, which may be unlisted counters. Both fail the
 * generation. Both lists are sorted.
 */
export const checkInt64Classification = (...classifications) => {
  const keys = new Set(classifications.flatMap((classification) => [...classification.keys]));
  const counters = new Set(classifications.flatMap((classification) => [...classification.counters]));
  return {
    unmatchedCounters: [...INT64_COUNTER_FIELDS].filter((name) => !counters.has(name)).sort(),
    keysNotNamedLikeKeys: [...keys]
      .filter((name) => name !== undefined && !KEY_NAME.test(name) && !KEYS_NOT_NAMED_LIKE_KEYS.has(name))
      .sort(),
  };
};
