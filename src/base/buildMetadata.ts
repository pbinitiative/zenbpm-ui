export interface BuildMetadata {
  git: {
    branch: string;
    commitId: string;
  };
  build: {
    version: string;
    time: string;
  };
}

export const frontendBuildMetadata: BuildMetadata = {
  git: {
    branch: __BUILD_BRANCH__,
    commitId: __BUILD_COMMIT__,
  },
  build: {
    version: __BUILD_VERSION__,
    time: __BUILD_TIME__,
  },
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const isBuildMetadata = (value: unknown): value is BuildMetadata => {
  if (!isRecord(value) || !isRecord(value.git) || !isRecord(value.build)) {
    return false;
  }

  return (
    typeof value.git.branch === 'string' &&
    typeof value.git.commitId === 'string' &&
    typeof value.build.version === 'string' &&
    typeof value.build.time === 'string'
  );
};

export const parseBuildMetadata = (value: unknown): BuildMetadata => {
  if (!isBuildMetadata(value)) {
    throw new Error('Invalid build metadata response');
  }

  return value;
};

const normalizeVersion = (version: string): string =>
  version
    .replace(/^v(?=\d)/i, '')
    .replace(/-rc\d+(?=\+?$)/i, '');

export const isBuildMetadataMatch = (
  frontend: BuildMetadata,
  backend: BuildMetadata
): boolean =>
  normalizeVersion(frontend.build.version) === normalizeVersion(backend.build.version);
