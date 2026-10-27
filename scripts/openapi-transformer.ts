/**
 * OpenAPI Transformer for Orval
 *
 * This transformer converts int64 keys to string types in the generated TypeScript.
 * JavaScript's Number type loses precision for integers > 2^53-1 (MAX_SAFE_INTEGER),
 * so we need to handle int64 keys as strings. Int64 counters stay numbers; see
 * `openapi-int64.mjs`.
 *
 * The runtime conversion is handled by:
 * - Incoming: json-bigint (axios response transformer) converts large numbers to strings
 * - Outgoing: Request body serialization converts strings back to JSON numbers
 */

import type { OpenAPIObject, SchemaObject, ReferenceObject } from 'openapi3-ts/oas30';
import { forEachInlineSchema, isInt64Key } from './openapi-int64.mjs';

/**
 * Recursively transform all int64 keys to string type. `name` is the property
 * or parameter the schema belongs to, if any. The members of its
 * `allOf`/`oneOf`/`anyOf` and its `items` keep that name, so a counter stays a
 * counter when composed or listed.
 */
function transformSchema(schema: SchemaObject | ReferenceObject | undefined, name?: string): void {
  if (!schema || '$ref' in schema) {
    return;
  }

  // Transform int64 keys to string
  if (isInt64Key(schema, name)) {
    schema.type = 'string';
    // Keep format as documentation but it won't affect TypeScript type
    schema.format = 'int64-string';
    // Add description note if not present
    if (!schema.description) {
      schema.description = 'Int64 value represented as string to preserve precision';
    }
  }

  // Recursively process nested schemas
  if (schema.properties) {
    Object.entries(schema.properties).forEach(([propertyName, property]) => {
      transformSchema(property, propertyName);
    });
  }

  if (schema.items) {
    transformSchema(schema.items, name);
  }

  if (schema.allOf) {
    schema.allOf.forEach((member) => transformSchema(member, name));
  }

  if (schema.oneOf) {
    schema.oneOf.forEach((member) => transformSchema(member, name));
  }

  if (schema.anyOf) {
    schema.anyOf.forEach((member) => transformSchema(member, name));
  }

  if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
    transformSchema(schema.additionalProperties);
  }
}

/**
 * Transform the OpenAPI spec to use string types for int64 keys.
 * This is called by Orval before generating TypeScript types.
 */
export default (inputSpec: OpenAPIObject): OpenAPIObject => {
  const spec = structuredClone(inputSpec);

  // Transform all schemas in components
  if (spec.components?.schemas) {
    Object.values(spec.components.schemas).forEach((schema) => transformSchema(schema));
  }

  // Transform inline schemas in paths: bodies, responses and parameters
  forEachInlineSchema<SchemaObject | ReferenceObject>(spec.paths, transformSchema);

  return spec;
};
