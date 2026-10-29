import { test, expect } from '@playwright/test';
import Ajv from 'ajv';
import { dropUntypedNullable } from '../../scripts/openapi-nullable.mjs';

/**
 * `nullable` of the validation schemas
 *
 * A schema of any JSON value admits null by `nullable: true` without `type`,
 * which AJV refuses to compile. The validation schema generator drops it there,
 * so that the runtime validator compiles and still accepts null, also where the
 * schema constrains its value otherwise.
 *
 * Unit tests of the generator scripts, run in Node by Playwright for lack of a
 * unit test runner: they take no `page`.
 */

test.describe('nullable of the validation schemas', () => {
  test('AJV refuses nullable without type', () => {
    expect(() => new Ajv({ strict: false }).compile(schemas().AnyOutput)).toThrow(
      '"nullable" cannot be used without "type"'
    );
  });

  test('drops nullable without type, nested too, and keeps it next to a type', () => {
    const generated = schemas();

    dropUntypedNullable(generated);

    expect(generated).toEqual({
      AnyOutput: { 'x-go-type': 'json.RawMessage' },
      Detail: {
        type: 'object',
        properties: {
          output: { description: 'any JSON value' },
          outputs: { type: 'array', items: {} },
          name: { type: 'string', nullable: true },
          status: { description: 'a status', anyOf: [{ enum: ['ACTIVE', 'DONE'] }, { type: 'null' }] },
          owner: { anyOf: [{ allOf: [{ type: 'object', required: ['id'] }] }, { type: 'null' }] },
          notNullable: { description: 'no null' },
        },
      },
    });
  });

  test('the dropped schemas compile and accept the same values, null too', () => {
    const generated = schemas();
    dropUntypedNullable(generated);
    const ajv = new Ajv({ strict: false });

    const validDetail = ajv.compile(generated.Detail);
    const outputs = [{ sport: 'squash' }, [{ discount: 0.1 }], 'squash', 0, false, null];

    expect(outputs.map((output) => validDetail({ output, outputs: [output] }))).toEqual(outputs.map(() => true));
    expect(validDetail({ name: null })).toBe(true);
    expect(validDetail({ name: 1 })).toBe(false);
    // A constrained value or null, as before
    expect([null, 'ACTIVE', 'OTHER'].map((status) => validDetail({ status }))).toEqual([true, true, false]);
    expect([null, { id: 1 }, {}].map((owner) => validDetail({ owner }))).toEqual([true, true, false]);
  });
});

function schemas() {
  return {
    AnyOutput: { nullable: true, 'x-go-type': 'json.RawMessage' },
    Detail: {
      type: 'object',
      properties: {
        output: { nullable: true, description: 'any JSON value' },
        outputs: { type: 'array', items: { nullable: true } },
        name: { type: 'string', nullable: true },
        status: { nullable: true, description: 'a status', enum: ['ACTIVE', 'DONE'] },
        owner: { nullable: true, allOf: [{ type: 'object', required: ['id'] }] },
        notNullable: { nullable: false, description: 'no null' },
      },
    },
  };
}
