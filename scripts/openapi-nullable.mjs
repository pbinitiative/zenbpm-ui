/**
 * OpenAPI 3.0 has no `null` type: a schema admits null by `nullable: true`,
 * also a schema of no `type`, such as one of any JSON value. AJV refuses to
 * compile `nullable` without `type`, so the validation schema generator drops
 * it there. A JSON Schema of no `type` and no constraint admits null anyway; a
 * constrained one, such as `{nullable: true, allOf: [...]}`, becomes
 * `{anyOf: [{allOf: [...]}, {type: 'null'}]}`, so the validator accepts the same
 * values.
 */
import { constraintsOf } from './openapi-free-form.mjs';
import { forEachSchema } from './openapi-int64.mjs';

/**
 * Drops `nullable` from every schema of no `type` among the component
 * `schemas`, a map of schemas by name, keeping null valid where it was.
 */
export const dropUntypedNullable = (schemas) => {
  for (const root of Object.values(schemas ?? {})) {
    forEachSchema(root, (schema) => {
      if (schema.type !== undefined || !('nullable' in schema)) return;
      const { nullable } = schema;
      delete schema.nullable;
      const constraints = constraintsOf(schema);
      if (nullable !== true || constraints.length === 0) return;
      // The constrained value or null; the annotations stay where they are
      const value = {};
      for (const keyword of constraints) {
        value[keyword] = schema[keyword];
        delete schema[keyword];
      }
      schema.anyOf = [value, { type: 'null' }];
    });
  }
};
