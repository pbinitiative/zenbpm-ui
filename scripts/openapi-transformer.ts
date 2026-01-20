/**
 * OpenAPI Transformer for Orval
 *
 * This transformer converts int64 fields to string types in the generated TypeScript.
 * JavaScript's Number type loses precision for integers > 2^53-1 (MAX_SAFE_INTEGER),
 * so we need to handle int64 values as strings.
 *
 * The runtime conversion is handled by:
 * - Incoming: json-bigint (axios response transformer) converts large numbers to strings
 * - Outgoing: Request body serialization converts strings back to JSON numbers
 */

import type { OpenAPIObject, SchemaObject, ReferenceObject } from 'openapi3-ts/oas30';

/**
 * Recursively transform all int64 fields to string type
 */
function transformSchema(schema: SchemaObject | ReferenceObject | undefined): void {
  if (!schema || '$ref' in schema) {
    return;
  }

  // Transform int64 to string
  if (schema.type === 'integer' && schema.format === 'int64') {
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
    Object.values(schema.properties).forEach(transformSchema);
  }

  if (schema.items) {
    transformSchema(schema.items);
  }

  if (schema.allOf) {
    schema.allOf.forEach(transformSchema);
  }

  if (schema.oneOf) {
    schema.oneOf.forEach(transformSchema);
  }

  if (schema.anyOf) {
    schema.anyOf.forEach(transformSchema);
  }

  if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
    transformSchema(schema.additionalProperties);
  }
}

/**
 * Transform the OpenAPI spec to use string types for int64 fields.
 * This is called by Orval before generating TypeScript types.
 */
export default (inputSpec: OpenAPIObject): OpenAPIObject => {
  const spec = structuredClone(inputSpec);

  // Transform all schemas in components
  if (spec.components?.schemas) {
    Object.values(spec.components.schemas).forEach(transformSchema);
  }

  // Transform inline schemas in paths
  if (spec.paths) {
    Object.values(spec.paths).forEach((pathItem) => {
      if (!pathItem) return;

      const operations = ['get', 'post', 'put', 'patch', 'delete'] as const;
      operations.forEach((method) => {
        const operation = pathItem[method];
        if (!operation) return;

        // Transform request body schemas
        if (operation.requestBody && 'content' in operation.requestBody) {
          Object.values(operation.requestBody.content).forEach((mediaType) => {
            transformSchema(mediaType.schema);
          });
        }

        // Transform response schemas
        if (operation.responses) {
          Object.values(operation.responses).forEach((response) => {
            if (response && 'content' in response) {
              const responseObj = response as { content?: Record<string, { schema?: SchemaObject | ReferenceObject }> };
              if (responseObj.content) {
                Object.values(responseObj.content).forEach((mediaType) => {
                  transformSchema(mediaType.schema);
                });
              }
            }
          });
        }

        // Transform parameter schemas
        if (operation.parameters) {
          operation.parameters.forEach((param) => {
            if ('schema' in param && param.schema) {
              transformSchema(param.schema);
            }
          });
        }
      });
    });
  }

  return spec;
};
