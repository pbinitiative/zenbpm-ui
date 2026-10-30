/**
 * The keywords of `schema` which constrain its value, leaving out annotations
 * such as `description`, `nullable` and `x-` extensions.
 */
export function constraintsOf(schema: object): string[];

/**
 * Whether `schema` is free-form: of any JSON value, or an object of no declared
 * properties whose entries are free-form or scalars. A reference to one of the
 * component `schemas` is what that component is.
 */
export function isFreeForm(schema: unknown, schemas?: unknown, seen?: Set<string>): boolean;

/**
 * Names of the properties which are free-form, and of those which are not.
 */
export interface FreeFormClassification {
  freeForm: Set<string>;
  structured: Set<string>;
}

/**
 * Classifies the properties of the component `schemas` and of the inline
 * schemas of `paths`, without changing them.
 */
export function classifyFreeFormFields(schemas: unknown, paths: unknown): FreeFormClassification;

/**
 * The names which are free-form in one place and not in another, sorted.
 */
export function checkFreeFormFields(classification: FreeFormClassification): string[];
