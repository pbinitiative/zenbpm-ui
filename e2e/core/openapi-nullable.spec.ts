import { test, expect } from '@playwright/test';
import Ajv from 'ajv';
import { dropUntypedNullable } from '../../scripts/openapi-nullable.mjs';

/**
 * `nullable` of the validation schemas
 *
 * A schema of any JSON value admits null by `nullable: true` without `type`,
 * which AJV refuses to compile. The validation schema generator drops it there,
 * so that the runtime validator compiles and still accepts null.
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
        },
      },
    });
  });

  test('the dropped schemas compile and accept any JSON value, null too', () => {
    const generated = schemas();
    dropUntypedNullable(generated);
    const ajv = new Ajv({ strict: false });

    const validDetail = ajv.compile(generated.Detail);
    const outputs = [{ sport: 'squash' }, [{ discount: 0.1 }], 'squash', 0, false, null];

    expect(outputs.map((output) => validDetail({ output, outputs: [output] }))).toEqual(outputs.map(() => true));
    expect(validDetail({ name: null })).toBe(true);
    expect(validDetail({ name: 1 })).toBe(false);
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
      },
    },
  };
}
