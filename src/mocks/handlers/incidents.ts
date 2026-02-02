// MSW handlers for incidents endpoints
import { http, HttpResponse } from 'msw';
import { findIncidentByKey } from '../data/incidents';
import { withValidation } from '../validation';

const BASE_URL = '/v1';

export const incidentHandlers = [
  // POST /incidents/:incidentKey/resolve - Resolve an incident
  http.post(
    `${BASE_URL}/incidents/:incidentKey/resolve`,
    withValidation(({ params }) => {
      const { incidentKey } = params;
      const incident = findIncidentByKey(incidentKey as string);

      if (!incident) {
        return HttpResponse.json(
          {
            code: 'NOT_FOUND',
            message: `Incident with key ${incidentKey} not found`,
          },
          { status: 404 }
        );
      }

      // In a real implementation, we'd update the incident's resolvedAt
      // For mock purposes, just return success
      return new HttpResponse(null, { status: 201 });
    })
  ),
];
