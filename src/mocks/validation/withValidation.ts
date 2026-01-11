// Higher-order function to wrap MSW handlers with validation
import { HttpResponse, delay, type HttpResponseResolver, type PathParams, type DefaultBodyType } from 'msw';
import { validateRequest, validateResponse } from './validator';
import { getDelay } from '../config';
import { stringifyMockData } from '@/base/utils/jsonBigInt';

// Wrap a handler with request/response validation and configurable delay
// Also converts string keys to JSON numbers to simulate real int64 API behavior
export function withValidation<
  Params extends PathParams = PathParams,
  RequestBody extends DefaultBodyType = DefaultBodyType,
  ResponseBody extends DefaultBodyType = DefaultBodyType,
>(
  handler: HttpResponseResolver<Params, RequestBody, ResponseBody>
): HttpResponseResolver<Params, RequestBody, ResponseBody> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wrappedHandler: HttpResponseResolver<Params, RequestBody, any> = async (info) => {
    const { request } = info;
    const method = request.method;
    const url = request.url;

    try {
      // Apply configurable delay before processing
      const delayValue = getDelay();
      if (delayValue !== 0) {
        await delay(delayValue);
      }

      // Validate request body for POST/PUT/PATCH methods
      if (['POST', 'PUT', 'PATCH'].includes(method)) {
        try {
          const clonedRequest = request.clone();
          const contentType = request.headers.get('content-type');

          if (contentType?.includes('application/json')) {
            const body = await clonedRequest.json();
            validateRequest(method, url, body);
          }
        } catch {
          // Request might not have a body or not be JSON
        }
      }

      // Call the original handler
      const response = await handler(info);

      // Process JSON responses: validate and convert keys to int64 format
      if (response instanceof Response) {
        const contentType = response.headers.get('content-type');

        if (contentType?.includes('application/json')) {
          try {
            const clonedResponse = response.clone();
            const body = await clonedResponse.json();

            // Note: Validation is done by axios interceptor after json-bigint parsing
            // We skip validation here to avoid double validation and type mismatches

            // Re-serialize with string keys converted to JSON numbers (int64 simulation)
            const jsonBody = stringifyMockData(body);
            return new HttpResponse(jsonBody, {
              status: response.status,
              statusText: response.statusText,
              headers: response.headers,
            });
          } catch {
            // Response might not have a body or not be valid JSON
          }
        }
      }

      return response;
    } catch (error) {
      // Log the error for debugging and return a 500 response
      console.error(`[MSW] Handler error for ${method} ${url}:`, error);
      return HttpResponse.json(
        { code: 'INTERNAL_ERROR', message: String(error) },
        { status: 500 }
      );
    }
  };

  return wrappedHandler as HttpResponseResolver<Params, RequestBody, ResponseBody>;
}

// Helper to create a validated JSON response
export function validatedJson<T extends Record<string, unknown> | unknown[]>(
  method: string,
  url: string,
  body: T,
  init?: ResponseInit
): Response {
  validateResponse(method, url, body);
  return HttpResponse.json(body, init);
}

/**
 * Create a JSON response with BigInt support.
 * Converts string keys to BigInt and serializes them as JSON numbers.
 * This simulates the real API behavior of sending int64 as JSON numbers.
 */
export function jsonBigInt<T>(body: T, init?: ResponseInit): Response {
  const jsonBody = stringifyMockData(body);
  return new HttpResponse(jsonBody, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });
}
