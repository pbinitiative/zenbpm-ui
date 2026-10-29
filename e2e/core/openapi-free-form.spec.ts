import { test, expect } from '@playwright/test';
import type { OpenAPIObject } from 'openapi3-ts/oas30';
import { checkFreeFormFields, classifyFreeFormFields, isFreeForm } from '../../scripts/openapi-free-form.mjs';

/**
 * Free-form fields of the spec
 *
 * The response parser and the request serialization leave the content of
 * free-form fields, such as variables and decision outputs, as it is: names in
 * there belong to the process, not to the API. The generator lists those
 * fields by the spec, and fails when a name is free-form in one place only.
 *
 * Unit tests of the generator scripts, run in Node by Playwright for lack of a
 * unit test runner: they take no `page`.
 */

test.describe('free-form fields of the spec', () => {
  test('tells free-form schemas from structured ones', () => {
    const shapes = {
      anyValue: {},
      anyValueDescribed: { nullable: true, description: 'any JSON value', 'x-go-type': 'json.RawMessage' },
      anyObject: { type: 'object' },
      objectOfAny: { type: 'object', additionalProperties: true },
      objectOfAnyValue: { type: 'object', additionalProperties: {} },
      mapOfStrings: { type: 'object', additionalProperties: { type: 'string' } },
      mapOfApiObjects: { type: 'object', additionalProperties: { $ref: '#/components/schemas/Job' } },
      objectWithProperties: { type: 'object', properties: { key: { type: 'string' } } },
      reference: { $ref: '#/components/schemas/Job' },
      composed: { allOf: [{ type: 'object' }] },
      enumeration: { enum: ['A', 'B'] },
      string: { type: 'string' },
      array: { type: 'array', items: {} },
    };

    const freeForm = Object.entries(shapes).filter(([, schema]) => isFreeForm(schema)).map(([name]) => name);

    expect(freeForm).toEqual(['anyValue', 'anyValueDescribed', 'anyObject', 'objectOfAny', 'objectOfAnyValue', 'mapOfStrings']);
  });

  test('classifies the properties of the components and of inline bodies, nested ones too', () => {
    const { components, paths } = spec();
    const untouched = structuredClone({ components, paths });

    const classification = classifyFreeFormFields(components?.schemas, paths);

    expect({ components, paths }).toEqual(untouched);
    expect(classification).toEqual({
      freeForm: new Set(['inputVariables', 'decisionOutput', 'outputValue', 'variables']),
      structured: new Set(['key', 'deliveryToken', 'evaluatedOutputs', 'jobKey']),
    });
    expect(checkFreeFormFields(classification)).toEqual([]);
  });

  test('follows references to the components, also round in circles', () => {
    const schemas = {
      Variables: { type: 'object', additionalProperties: true },
      AnyValue: { $ref: '#/components/schemas/Variables' },
      Job: { type: 'object', properties: { key: { type: 'string' } } },
      Loop: { $ref: '#/components/schemas/Loop' },
    };
    const reference = (name: string) => ({ $ref: `#/components/schemas/${name}` });

    expect(['Variables', 'AnyValue', 'Job', 'Loop', 'Missing'].map((name) => isFreeForm(reference(name), schemas)))
      .toEqual([true, true, false, false, false]);
    expect(isFreeForm({ type: 'object', additionalProperties: reference('Variables') }, schemas)).toBe(true);
    // A property referring to a free-form component is free-form too, so that its name is checked
    expect(checkFreeFormFields(classifyFreeFormFields({
      ...schemas,
      Instance: { type: 'object', properties: { variables: reference('Variables') } },
      Detail: { type: 'object', properties: { variables: reference('Job') } },
    }, {}))).toEqual(['variables']);
  });

  test('reports a name which is free-form in one place and structured in another', () => {
    const schemas = {
      Job: { type: 'object', properties: { variables: {} } },
      Instance: { type: 'object', properties: { variables: { $ref: '#/components/schemas/Variables' } } },
    };

    expect(checkFreeFormFields(classifyFreeFormFields(schemas, {}))).toEqual(['variables']);
  });
});

function spec(): OpenAPIObject {
  return {
    openapi: '3.0.0',
    info: { title: 'free-form fields', version: '1' },
    paths: {
      '/jobs/{jobKey}/complete': {
        post: {
          parameters: [{ name: 'jobKey', in: 'path', required: true, schema: { type: 'integer', format: 'int64' } }],
          requestBody: {
            content: {
              'application/json': {
                schema: { type: 'object', properties: { jobKey: { type: 'string' }, variables: { type: 'object' } } },
              },
            },
          },
          responses: {},
        },
      },
    },
    components: {
      schemas: {
        Job: {
          type: 'object',
          properties: {
            key: { type: 'integer', format: 'int64' },
            deliveryToken: { type: 'integer', format: 'int64' },
            inputVariables: { type: 'object', additionalProperties: true },
          },
        },
        Decision: {
          type: 'object',
          properties: {
            decisionOutput: { nullable: true, 'x-go-type': 'json.RawMessage' },
            evaluatedOutputs: { type: 'array', items: { type: 'object', properties: { outputValue: {} } } },
          },
        },
      },
    },
  };
}
