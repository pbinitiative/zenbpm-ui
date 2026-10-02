// MSW handlers for incidents endpoints
import { http, HttpResponse } from 'msw';
import { findIncidentByKey } from '../data/incidents';
import {
  definitionRetriesNotEvaluable,
  incidentAlreadyResolved,
  incidentWithoutJobRefusesRetries,
  jobNoLongerWaitsRefusal,
  jobOfMockIncident,
  leaderCallFailure,
  operatorRetriesRefusal,
  resolveMockIncident,
  retryAtSchemaRefusal,
  updateMockJobRetries,
} from '../data/jobRetries';
import { withValidation } from '../validation';
import { hasScenario } from './scenarios';

const BASE_URL = '/v1';

let failedResolutions = 0;

/** The optional body of a resolution: retries the resolution gives the job of the incident. */
interface ResolveIncidentBody {
  retries?: unknown;
  retryAt?: unknown;
}

const readOptionalBody = async (request: Request): Promise<ResolveIncidentBody> => {
  const text = await request.text();
  return text === '' ? {} : (JSON.parse(text) as ResolveIncidentBody);
};

const badRequest = (message: string) => HttpResponse.json({ code: 'BAD_REQUEST', message }, { status: 400 });

export const incidentHandlers = [
  // POST /incidents/:incidentKey/resolve - Resolve an incident
  http.post(
    `${BASE_URL}/incidents/:incidentKey/resolve`,
    withValidation(async ({ params, request }) => {
      const { incidentKey } = params;
      const body = await readOptionalBody(request);
      const schemaRefusal = retryAtSchemaRefusal(body.retryAt);
      if (schemaRefusal !== undefined) return badRequest(schemaRefusal);
      // checked by the REST layer, before the incident is looked up
      if (body.retryAt !== undefined && body.retries === undefined) {
        return badRequest('retryAt can only be given together with retries');
      }
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
      const job = jobOfMockIncident(incident);
      // somebody else resolves the incident after the UI looked it up
      if (hasScenario(request, 'incidentResolvedMeanwhile') && !incident.resolvedAt) {
        resolveMockIncident(incident, job);
      }
      if (incident.resolvedAt) {
        return HttpResponse.json({ code: 'CONFLICT', message: incidentAlreadyResolved(incident) }, { status: 409 });
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

      // retries given with the resolution are set in its transaction, so
      // whatever is refused changes neither them nor the incident
      if (body.retries !== undefined) {
        if (!job) return badRequest(incidentWithoutJobRefusesRetries(incident));
        const retriesRefusal = operatorRetriesRefusal(job.key, body.retries, body.retryAt);
        if (retriesRefusal !== undefined) return badRequest(leaderCallFailure(call, retriesRefusal));
        const conflict = jobNoLongerWaitsRefusal(job);
        if (conflict !== undefined) return HttpResponse.json({ code: 'CONFLICT', message: conflict }, { status: 409 });
      }
      // the definition's retries are evaluated only without retries of the operator's own
      const refusal = body.retries === undefined && hasScenario(request, 'definitionRetriesNotEvaluable')
        ? definitionRetriesNotEvaluable(incident, job)
        : undefined;
      if (refusal !== undefined) {
        return HttpResponse.json({ code: 'CONFLICT', message: refusal }, { status: 409 });
      }

      if (job && body.retries !== undefined) {
        updateMockJobRetries(job, body.retries as number, typeof body.retryAt === 'string' ? body.retryAt : undefined);
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
