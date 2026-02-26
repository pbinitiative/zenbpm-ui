
// OpenAPI response/request validator for MSW handlers and live backend
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { schemas, endpointSchemas } from '@base/openapi/generated-api/generated-openapi-schemas.ts';

/**
 * Check if API validation is enabled via environment variable.
 * Disabled by default (production), enabled in dev modes via .env.mocks/.env.live
 */
function isValidationEnabled(): boolean {
  return import.meta.env.VITE_API_VALIDATION === 'true';
}

// Initialize AJV with formats support
const ajv = new Ajv({
  allErrors: true,
  strict: false,
  validateFormats: true,
});
addFormats(ajv);

// Add all schemas to AJV instance
for (const [name, schema] of Object.entries(schemas)) {
  ajv.addSchema(schema, `#/components/schemas/${name}`);
}

// Compile all schemas
const compiledSchemas: Record<string, ReturnType<typeof ajv.compile>> = {};
for (const [name, schema] of Object.entries(schemas)) {
  compiledSchemas[name] = ajv.compile(schema);
}

// Validation result type
interface ValidationResult {
  valid: boolean;
  errors?: Array<{
    path: string;
    message: string;
  }>;
}

// Validate data against a schema
function validateAgainstSchema(schemaName: string, data: unknown): ValidationResult {
  const validate = compiledSchemas[schemaName];
  if (!validate) {
    console.warn(`[MSW Validator] Schema "${schemaName}" not found`);
    return { valid: true };
  }

  const valid = validate(data);
  if (!valid && validate.errors) {
    return {
      valid: false,
      errors: validate.errors.map((err) => ({
        path: err.instancePath || '/',
        message: err.message || 'Unknown error',
      })),
    };
  }

  return { valid: true };
}

// Log validation errors to console with grouped details
function logValidationErrors(
  type: 'request' | 'response',
  method: string,
  url: string,
  schemaName: string,
  errors: ValidationResult['errors'],
  data: unknown
): void {
  // Create a summary for the group header
  const errorCount = errors?.length || 0;
  const urlPath = new URL(url, 'http://localhost').pathname;

  // Use red color for the header to make it stand out
  console.groupCollapsed(
    `%c✗ [MSW Validator] Invalid ${type}%c ${method} ${urlPath} %c(${errorCount} error${errorCount !== 1 ? 's' : ''})`,
    'color: #ff6b6b; font-weight: bold',
    'color: #74b9ff; font-weight: normal',
    'color: #ffeaa7; font-weight: normal'
  );

  // Log schema info
  console.log('%cSchema:%c ' + schemaName, 'color: #a29bfe; font-weight: bold', 'color: inherit');

  // Log each error
  if (errors && errors.length > 0) {
    console.log('%cErrors:', 'color: #ff6b6b; font-weight: bold');
    errors.forEach((err, index) => {
      console.log(`  ${index + 1}. %c${err.path}%c: ${err.message}`, 'color: #fd79a8', 'color: inherit');
    });
  }

  // Log the data (truncated for large payloads)
  console.log('%cData:', 'color: #00cec9; font-weight: bold');
  try {
    const jsonStr = JSON.stringify(data, null, 2);
    if (jsonStr.length > 2000) {
      console.log(JSON.parse(jsonStr.slice(0, 2000) + '..."'));
      console.log(`  ... (truncated, total ${jsonStr.length} chars)`);
    } else {
      console.log(data);
    }
  } catch {
    console.log(data);
  }

  console.groupEnd();

  // Also log a prominent error message (visible without expanding the group)
  const errorDetails = errors?.map((err) => `${err.path}: ${err.message}`).join(', ') || 'unknown';
  console.error(
    `%c✗ [MSW Validator] Invalid ${type} %c${method} ${urlPath}%c\n` +
    `  Schema: ${schemaName}\n` +
    `  Errors: ${errorDetails}`,
    'color: #ff6b6b; font-weight: bold; font-size: 12px',
    'color: #74b9ff; font-weight: bold',
    'color: inherit'
  );
}

// Match URL to endpoint pattern
function matchEndpoint(method: string, url: string): string | null {
  const urlPath = new URL(url, 'http://localhost').pathname;

  // Try exact match first
  const exactKey = `${method} ${urlPath}`;
  if ((endpointSchemas as Record<string, { request?: string; response?: string }>)[exactKey]) {
    return exactKey;
  }

  // Try pattern matching (replace path params with :param)
  for (const key of Object.keys(endpointSchemas)) {
    const [keyMethod, keyPath] = key.split(' ');
    if (keyMethod !== method) continue;

    // Convert pattern to regex
    const pattern = keyPath.replace(/:[^/]+/g, '[^/]+');
    const regex = new RegExp(`^${pattern}$`);
    if (regex.test(urlPath)) {
      return key;
    }
  }

  return null;
}

// Validate a request body
export function validateRequest(method: string, url: string, body: unknown): ValidationResult {
  if (!isValidationEnabled()) {
    return { valid: true }; // Validation disabled
  }

  const endpointKey = matchEndpoint(method, url);
  if (!endpointKey) {
    return { valid: true }; // No schema defined, skip validation
  }

  // const schemaInfo = endpointSchemas[endpointKey];
  const schemaInfo = (endpointSchemas as Record<string, { request?: string; response?: string }>)[endpointKey];
  if (!schemaInfo?.request) {
    return { valid: true }; // No request schema defined
  }

  const result = validateAgainstSchema(schemaInfo.request, body);
  if (!result.valid) {
    logValidationErrors('request', method, url, schemaInfo.request, result.errors, body);
  }

  return result;
}

// Validate a response body
export function validateResponse(method: string, url: string, body: unknown): ValidationResult {
  if (!isValidationEnabled()) {
    return { valid: true }; // Validation disabled
  }

  const endpointKey = matchEndpoint(method, url);
  if (!endpointKey) {
    return { valid: true }; // No schema defined, skip validation
  }

  // const schemaInfo = endpointSchemas[endpointKey];
  const schemaInfo = (endpointSchemas as Record<string, { request?: string; response?: string }>)[endpointKey];
  if (!schemaInfo?.response) {
    return { valid: true }; // No response schema defined
  }

  const result = validateAgainstSchema(schemaInfo.response, body);
  if (!result.valid) {
    logValidationErrors('response', method, url, schemaInfo.response, result.errors, body);
  }

  return result;
}

// Create a validated HttpResponse helper
export function createValidatedResponse<T>(
  method: string,
  url: string,
  body: T
): { body: T; isValid: boolean } {
  const result = validateResponse(method, url, body);
  return {
    body,
    isValid: result.valid,
  };
}
