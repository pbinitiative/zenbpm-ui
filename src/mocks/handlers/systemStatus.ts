import { delay, http, HttpResponse } from 'msw';
import { frontendBuildMetadata } from '@base/buildMetadata';

const getScenario = (request: Request): string | null => {
  if (import.meta.env.VITE_E2E_TEST !== 'true' || !request.referrer) {
    return null;
  }

  return new URL(request.referrer).searchParams.get('systemStatusScenario');
};

const createSystemStatus = (version: string, commit: string) => ({
  clusterConfig: { desiredPartitions: 3 },
  partitions: {},
  nodes: {},
  version,
  commit,
});

export const systemStatusHandlers = [
  http.get('/system/status', async ({ request }) => {
    const scenario = getScenario(request);

    if (scenario === 'loading') {
      await delay(10_000);
    }

    if (scenario === 'error') {
      return HttpResponse.json(null, { status: 503 });
    }

    if (scenario === 'mismatch') {
      return HttpResponse.json(createSystemStatus(`${frontendBuildMetadata.version}+`, frontendBuildMetadata.commit));
    }

    if (scenario === 'release-candidate') {
      return HttpResponse.json(createSystemStatus(`${frontendBuildMetadata.version}-rc1`, frontendBuildMetadata.commit));
    }

    if (scenario === 'commit-difference') {
      return HttpResponse.json(createSystemStatus(frontendBuildMetadata.version, '1234567'));
    }

    return HttpResponse.json(createSystemStatus(frontendBuildMetadata.version, frontendBuildMetadata.commit));
  }),
];
