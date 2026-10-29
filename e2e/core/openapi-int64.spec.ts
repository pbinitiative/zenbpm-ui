import { test, expect } from '@playwright/test';
import type { OpenAPIObject } from 'openapi3-ts/oas30';
import transformer from '../../scripts/openapi-transformer';
import {
  checkInt64Classification,
  classifyInt64OfPaths,
  retypeInt64KeysToString,
} from '../../scripts/openapi-int64.mjs';

/**
 * Int64 classification of the generators
 *
 * The Orval transformer (client types) and the validation schema generator turn
 * int64 keys into strings and keep int64 counters integers, by the name of the
 * property or parameter. These tests run both on the shapes a counter may take
 * in the spec, so that a counter cannot turn into a key string again.
 *
 * Unit tests of the generator scripts, run in Node by Playwright for lack of a
 * unit test runner: they take no `page`.
 */

test.describe('int64 classification of the generators', () => {
  test('client types keep counters numbers in any shape and make keys strings', () => {
    const generated = transformer(spec());

    expect(typesAt(generated.components?.schemas)).toEqual(EXPECTED_TYPES);
    expect(typeAt(generated.paths, ['/jobs/{jobKey}', 'get', 'parameters', '0', 'schema'])).toBe('string');
    expect(typeAt(generated.paths, ['/jobs/{jobKey}', 'get', 'parameters', '1', 'schema'])).toBe('integer');
    expect(typeAt(generated.paths, [...FAIL_BODY, 'properties', 'deliveryToken'])).toBe('integer');
    // A worker's request takes the token of a delivery, so never `0`
    expect(typeAt(generated.paths, [...FAIL_BODY, 'properties', 'deliveryToken'], 'minimum')).toBe(1);
  });

  test('validation schemas keep counters integers in any shape and make keys strings', () => {
    const schemas = spec().components?.schemas;

    const classification = retypeInt64KeysToString(schemas);

    expect(typesAt(schemas)).toEqual(EXPECTED_TYPES);
    expect(typeAt(schemas, ['Job', 'properties', 'key'], 'pattern')).toBe('^\\d{15,25}$');
    expect(checkInt64Classification(classification)).toEqual({
      unmatchedCounters: [],
      keysNotNamedLikeKeys: [],
      keysOfOtherTypes: [],
    });
  });

  test('reports listed counters no int64 matched and keys not named like one', () => {
    // Counters added to the contract without being listed, one named like the
    // delivery token, and none of the listed counters
    const schemas = {
      Job: {
        type: 'object',
        properties: { key: int64(), executionToken: int64(), attempts: int64(), retryToken: int64() },
      },
    };

    expect(checkInt64Classification(retypeInt64KeysToString(schemas))).toEqual({
      unmatchedCounters: ['deliveryToken'],
      keysNotNamedLikeKeys: ['attempts', 'retryToken'],
      keysOfOtherTypes: [],
    });
  });

  test('reports keys whose name another scalar has too, which the request serialization would send as numbers', () => {
    // A string `key` holding digits would reach the engine as a JSON number
    const schemas = {
      Job: { type: 'object', properties: { key: int64(), deliveryToken: int64() } },
      Variable: { type: 'object', properties: { key: { type: 'string' }, deliveryToken: { type: 'string' } } },
    };

    expect(checkInt64Classification(retypeInt64KeysToString(schemas))).toEqual({
      unmatchedCounters: [],
      keysNotNamedLikeKeys: [],
      // A counter is never sent otherwise than as its value is, so its name may be shared
      keysOfOtherTypes: ['key'],
    });
  });

  test('classifies the inline schemas of the paths, which the validation schemas leave out', () => {
    const { paths } = spec();
    const untouched = structuredClone(paths);

    const classification = classifyInt64OfPaths(paths);

    expect(paths).toEqual(untouched);
    expect(classification).toEqual({
      keys: new Set(['jobKey', 'jobKeyIn']),
      counters: new Set(['deliveryToken']),
      others: new Set(),
    });
    // A counter which no component schema has, but a request body does, is matched
    const components = { Job: { type: 'object', properties: { key: int64() } } };
    expect(checkInt64Classification(retypeInt64KeysToString(components), classification)).toEqual({
      unmatchedCounters: [],
      keysNotNamedLikeKeys: [],
      keysOfOtherTypes: [],
    });
  });
});

// Where the synthetic spec has an int64, and what each generator must make of it
const EXPECTED_TYPES: Record<string, string> = {
  'Job.properties.key': 'string',
  'Job.properties.deliveryToken': 'integer',
  // A counter composed with `allOf`, made nullable with `anyOf` or listed in an array
  'ComposedJob.properties.deliveryToken.allOf.0': 'integer',
  'NullableJob.properties.deliveryToken.anyOf.0': 'integer',
  'Tokens.properties.deliveryToken.items': 'integer',
  // Jobs in an array
  'JobPage.properties.items.items.properties.key': 'string',
  'JobPage.properties.items.items.properties.deliveryToken': 'integer',
  // The properties of an object have names of their own, whatever the object is called
  'Delivery.properties.deliveryToken.properties.jobKey': 'string',
  // A counter ruled out with `not`, and the values of a map, which have no name
  'NotJob.properties.deliveryToken.not': 'integer',
  'KeysByName.additionalProperties': 'string',
};

const int64 = () => ({ type: 'integer' as const, format: 'int64' });

// The inline request body of the job failure in the synthetic spec
const FAIL_BODY = ['/jobs/{jobKey}/fail', 'post', 'requestBody', 'content', 'application/json', 'schema'];

function spec(): OpenAPIObject {
  return {
    openapi: '3.0.0',
    info: { title: 'int64 classification', version: '1' },
    paths: {
      '/jobs/{jobKey}': {
        get: {
          parameters: [
            { name: 'jobKey', in: 'path', required: true, schema: int64() },
            { name: 'deliveryToken', in: 'query', schema: int64() },
          ],
          responses: {},
        },
      },
      '/jobs': {
        get: {
          parameters: [{ name: 'jobKeyIn', in: 'query', schema: { type: 'array', items: int64() } }],
          responses: {},
        },
      },
      '/jobs/{jobKey}/fail': {
        post: {
          requestBody: {
            content: {
              'application/json': {
                schema: { type: 'object', properties: { deliveryToken: { ...int64(), minimum: 1 } } },
              },
            },
          },
          responses: {},
        },
      },
    },
    components: {
      schemas: {
        Job: { type: 'object', properties: { key: int64(), deliveryToken: int64() } },
        ComposedJob: { type: 'object', properties: { deliveryToken: { allOf: [int64()] } } },
        NullableJob: {
          type: 'object',
          properties: { deliveryToken: { anyOf: [{ ...int64(), nullable: true }, { type: 'string' }] } },
        },
        Tokens: { type: 'object', properties: { deliveryToken: { type: 'array', items: int64() } } },
        JobPage: {
          type: 'object',
          properties: {
            items: { type: 'array', items: { type: 'object', properties: { key: int64(), deliveryToken: int64() } } },
          },
        },
        Delivery: {
          type: 'object',
          properties: { deliveryToken: { type: 'object', properties: { jobKey: int64() } } },
        },
        NotJob: { type: 'object', properties: { deliveryToken: { not: int64() } } },
        KeysByName: { type: 'object', additionalProperties: int64() },
      },
    },
  };
}

function typesAt(root: unknown): Record<string, unknown> {
  return Object.fromEntries(Object.keys(EXPECTED_TYPES).map((path) => [path, typeAt(root, path.split('.'))]));
}

function typeAt(root: unknown, path: string[], field = 'type'): unknown {
  const schema = path.reduce<unknown>((node, segment) => (node as Record<string, unknown> | undefined)?.[segment], root);
  return (schema as Record<string, unknown> | undefined)?.[field];
}
