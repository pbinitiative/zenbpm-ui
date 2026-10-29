/**
 * OpenAPI 3.0 has no `null` type: a schema admits null by `nullable: true`,
 * also a schema of no `type`, such as one of any JSON value. AJV refuses to
 * compile `nullable` without `type`, so the validation schema generator drops
 * it there. A JSON Schema of no `type` admits null anyway, so the validator
 * accepts the same values.
 */
import { forEachSchema } from './openapi-int64.mjs';

/**
 * Drops `nullable` from every schema of no `type` among the component
 * `schemas`, a map of schemas by name.
 */
export const dropUntypedNullable = (schemas) => {
  for (const root of Object.values(schemas ?? {})) {
    forEachSchema(root, (schema) => {
      if (schema.type === undefined) {
        delete schema.nullable;
      }
    });
  }
};
