// MSW handlers for incidents endpoints
import { http, HttpResponse } from 'msw';
import { findIncidentByKey } from '../data/incidents';
import { findJobByKey } from '../data/jobs';
import { definitionRetriesNotEvaluable, leaderCallFailure, resolveMockIncident } from '../data/jobRetries';
import { withValidation } from '../validation';

const BASE_URL = '/v1';

// E2E tests name scenarios in the page URL, several separated by commas,
// e.g. `?jobRetriesScenario=resolveIncidentFailsOnce,definitionRetriesNotEvaluable`.
const hasScenario = (request: Request, scenario: string): boolean => {
  if (import.meta.env.VITE_E2E_TEST !== 'true' || !request.referrer) {
    return false;
  }

  const scenarios = new URL(request.referrer).searchParams.get('jobRetriesScenario') ?? '';
  return scenarios.split(',').includes(scenario);
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

      const call = 'resolve incident';
      if (incident.resolvedAt) {
        return HttpResponse.json(
          {
            code: 'TECHNICAL_ERROR',
            message: leaderCallFailure(call, `failed to resolve incident ${String(incidentKey)}: incident already resolved`),
          },
          { status: 500 }
        );
      }

      // the engine failed to save the resolution: nothing changed
      if (hasScenario(request, 'resolveIncidentFailsOnce') && failedResolutions === 0) {
        failedResolutions++;
        return HttpResponse.json(
          {
            code: 'TECHNICAL_ERROR',
            message: leaderCallFailure(
              call,
              `failed to resolve incident ${String(incidentKey)}: failed to complete incident with key: ${String(incidentKey)}`
            ),
          },
          { status: 500 }
        );
      }

      const job = incident.jobKey ? findJobByKey(incident.jobKey) : undefined;
      const refusal = hasScenario(request, 'definitionRetriesNotEvaluable')
        ? definitionRetriesNotEvaluable(job)
        : undefined;
      if (refusal !== undefined) {
        return HttpResponse.json({ code: 'CONFLICT', message: refusal }, { status: 409 });
      }

      resolveMockIncident(incident, job);
      // the resolution was saved, but continuing the instance failed: the
      // engine answers with an error although the incident is resolved
      if (hasScenario(request, 'resolutionSavedThenInstanceFails')) {
        return HttpResponse.json(
          {
            code: 'TECHNICAL_ERROR',
            message: leaderCallFailure(
              call,
              `failed to resolve incident ${String(incidentKey)}: failed to continue process instance ` +
                `${incident.processInstanceKey} after resolving incident ${String(incidentKey)}: payment gateway unreachable`
            ),
          },
          { status: 500 }
        );
      }
      return new HttpResponse(null, { status: 201 });
    })
  ),
];
