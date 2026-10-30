/**
 * Free-form fields of the API: properties of any JSON value, or objects whose
 * entries the process or decision names, such as variables, decision outputs
 * and task headers. Their content is named and typed by the process, not by the
 * API, so the response parser and the request serialization leave it as it is:
 * a variable called `jobKey` or `deliveryToken` holding `"00123"` must stay that
 * string (see `src/base/utils/jsonBigInt.ts`).
 */
import { forEachInlineSchema, forEachSchema } from './openapi-int64.mjs';

// Keywords which describe a schema without constraining its value
const ANNOTATIONS = new Set([
  'description', 'title', 'example', 'examples', 'default', 'deprecated', 'readOnly', 'writeOnly', 'externalDocs',
  'xml', 'nullable',
]);

const SCALAR_TYPES = new Set(['string', 'number', 'integer', 'boolean']);

/** The keywords of `schema` which constrain its value */
export const constraintsOf = (schema) =>
  Object.keys(schema).filter((keyword) => !ANNOTATIONS.has(keyword) && !keyword.startsWith('x-'));

const COMPONENT_REF = /^#\/components\/schemas\/(.+)$/;

/**
 * Whether `schema` is free-form: of any JSON value, or an object of no declared
 * properties whose entries are free-form or scalars. A map of API objects is
 * not, as their fields are the API's. A reference to one of the component
 * `schemas` is what that component is; `seen` holds the references followed.
 */
export const isFreeForm = (schema, schemas, seen = new Set()) => {
  if (!schema || typeof schema !== 'object') return false;
  if ('$ref' in schema) {
    const name = COMPONENT_REF.exec(schema.$ref)?.[1];
    if (name === undefined || seen.has(name)) return false;
    return isFreeForm(schemas?.[name], schemas, new Set(seen).add(name));
  }
  const constraints = constraintsOf(schema);
  if (constraints.length === 0) return true;
  if (schema.type !== 'object' || !constraints.every((keyword) => keyword === 'type' || keyword === 'additionalProperties')) {
    return false;
  }
  const entries = schema.additionalProperties;
  return entries === undefined || entries === true || isFreeForm(entries, schemas, seen) ||
    (typeof entries === 'object' && SCALAR_TYPES.has(entries.type) && constraintsOf(entries).every((keyword) => keyword === 'type' || keyword === 'format'));
};

/**
 * Names of the properties which are free-form, and of those which are not,
 * among the component `schemas` and the inline schemas of `paths`. Neither is
 * changed.
 */
export const classifyFreeFormFields = (schemas, paths) => {
  const classification = { freeForm: new Set(), structured: new Set() };
  const classify = (root) => {
    forEachSchema(root, (schema) => {
      for (const [name, property] of Object.entries(schema.properties ?? {})) {
        (isFreeForm(property, schemas) ? classification.freeForm : classification.structured).add(name);
      }
    });
  };
  Object.values(schemas ?? {}).forEach(classify);
  forEachInlineSchema(paths, classify);
  return classification;
};

/**
 * The names which are free-form in one place and not in another, sorted. The
 * parser matches the names wherever they occur, so such a name fails the
 * generation: the parser would leave the structured one alone too.
 */
export const checkFreeFormFields = ({ freeForm, structured }) =>
  [...freeForm].filter((name) => structured.has(name)).sort();
