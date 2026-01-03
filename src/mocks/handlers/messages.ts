// MSW handlers for messages endpoints
import { http, HttpResponse } from 'msw';
import { withValidation } from '../validation';

const BASE_URL = '/v1';

export const messageHandlers = [
  // POST /messages - Publish a message
  http.post(
    `${BASE_URL}/messages`,
    withValidation(async ({ request }) => {
      const body = (await request.json()) as {
        correlationKey: string;
        messageName: string;
        variables?: Record<string, unknown>;
      };

      // Validate required fields
      if (!body.correlationKey || !body.messageName) {
        return HttpResponse.json(
          {
            code: 'BAD_REQUEST',
            message: 'correlationKey and messageName are required',
          },
          { status: 400 }
        );
      }

      // In a real implementation, this would correlate the message with waiting process instances
      // For mock purposes, just return success
      return new HttpResponse(null, { status: 201 });
    })
  ),
];
