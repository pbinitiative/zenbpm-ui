import { delay, http, HttpResponse } from 'msw';
import { frontendBuildMetadata } from '@base/buildMetadata';

const getScenario = (request: Request): string | null => {
  if (import.meta.env.VITE_E2E_TEST !== 'true' || !request.referrer) {
    return null;
  }

  return new URL(request.referrer).searchParams.get('systemStatusScenario');
};

const createSystemStatus = (version: string, commitId: string) => ({
  git: {
    branch: 'main',
    commitId,
  },
  build: {
    version: `v${version}`,
    time: '2026-08-10T07:33:20Z',
  },
  clusterConfig: { desiredPartitions: 3 },
  partitions: {},
  nodes: {},
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
      return HttpResponse.json(createSystemStatus(`${frontendBuildMetadata.build.version}+`, frontendBuildMetadata.git.commitId));
    }

    if (scenario === 'release-candidate') {
      return HttpResponse.json(createSystemStatus(`${frontendBuildMetadata.build.version}-rc1`, frontendBuildMetadata.git.commitId));
    }

    if (scenario === 'commit-difference') {
      return HttpResponse.json(createSystemStatus(frontendBuildMetadata.build.version, '123456789abc'));
    }

    return HttpResponse.json(createSystemStatus(frontendBuildMetadata.build.version, frontendBuildMetadata.git.commitId));
  }),
];
