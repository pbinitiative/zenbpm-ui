// MSW handlers for incidents endpoints
import { http, HttpResponse } from 'msw';
import { incidents, findIncidentByKey, getIncidentsByProcessInstanceKey } from '../data/incidents';
import { withValidation } from '../validation';

const BASE_URL = '/v1';

export const incidentHandlers = [
  // GET /incidents - List incidents
  http.get(
    `${BASE_URL}/incidents`,
    withValidation(({ request }) => {
      const url = new URL(request.url);
      const page = parseInt(url.searchParams.get('page') || '1', 10);
      const size = parseInt(url.searchParams.get('size') || '10', 10);
      const resolved = url.searchParams.get('resolved');
      const processInstanceKey = url.searchParams.get('processInstanceKey');
      const bpmnProcessId = url.searchParams.get('bpmnProcessId');

      // Start with all incidents
      let filteredIncidents = [...incidents];

      // Filter by process instance key
      if (processInstanceKey) {
        filteredIncidents = getIncidentsByProcessInstanceKey(processInstanceKey);
      }

      // Filter by bpmnProcessId
      if (bpmnProcessId) {
        filteredIncidents = filteredIncidents.filter((i) => i.bpmnProcessId === bpmnProcessId);
      }

      // Filter by resolved status
      if (resolved === 'true') {
        filteredIncidents = filteredIncidents.filter((i) => i.resolvedAt);
      } else if (resolved === 'false') {
        filteredIncidents = filteredIncidents.filter((i) => !i.resolvedAt);
      }

      // Sort by createdAt descending (newest first)
      filteredIncidents.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      // Paginate
      const startIndex = (page - 1) * size;
      const endIndex = startIndex + size;
      const paginatedItems = filteredIncidents.slice(startIndex, endIndex);

      return HttpResponse.json({
        items: paginatedItems,
        page,
        size,
        count: paginatedItems.length,
        totalCount: filteredIncidents.length,
      });
    })
  ),

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
