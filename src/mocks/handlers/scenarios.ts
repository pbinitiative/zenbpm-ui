// E2E tests name scenarios in the page URL, several separated by commas,
// e.g. `?jobRetriesScenario=resolveIncidentFailsOnce,definitionRetriesNotEvaluable`.
// Every handler reads them through `hasScenario`, so that any combination
// triggers each scenario named.
export const hasScenario = (request: Request, scenario: string): boolean => {
  if (import.meta.env.VITE_E2E_TEST !== 'true' || !request.referrer) {
    return false;
  }

  const scenarios = new URL(request.referrer).searchParams.get('jobRetriesScenario') ?? '';
  return scenarios.split(',').includes(scenario);
};
