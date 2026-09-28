// MSW handlers for incidents endpoints
import { http, HttpResponse } from 'msw';
import { findIncidentByKey } from '../data/incidents';
import { findJobByKey } from '../data/jobs';
import { resolveMockIncident } from '../data/jobRetries';
import { withValidation } from '../validation';

const BASE_URL = '/v1';

// E2E tests name a scenario in the page URL, e.g. `?jobRetriesScenario=resolveIncidentFailsOnce`.
const getScenario = (request: Request): string | null => {
  if (import.meta.env.VITE_E2E_TEST !== 'true' || !request.referrer) {
    return null;
  }

  return new URL(request.referrer).searchParams.get('jobRetriesScenario');
};

let failedResolutions = 0;

export const incidentHandlers = [
  // POST /incidents/:incidentKey/resolve - Resolve an incident
  http.post(
    `${BASE_URL}/incidents/:incidentKey/resolve`,
    withValidation(({ params, request }) => {
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

      if (getScenario(request) === 'resolveIncidentFailsOnce' && failedResolutions === 0) {
        failedResolutions++;
        return HttpResponse.json(
          { code: 'INTERNAL', message: `failed to complete incident with key: ${String(incidentKey)}` },
          { status: 500 }
        );
      }

      if (!incident.resolvedAt) {
        resolveMockIncident(incident, incident.jobKey ? findJobByKey(incident.jobKey) : undefined);
      }
      return new HttpResponse(null, { status: 201 });
    })
  ),
];
