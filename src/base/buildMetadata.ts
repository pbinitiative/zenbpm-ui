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

const normalizeVersion = (version: string): string =>
  version
    .replace(/^v(?=\d)/i, '')
    .replace(/-rc\d+(?=\+?$)/i, '');

export const isBuildMetadataMatch = (
  frontend: BuildMetadata,
  backend: BuildMetadata
): boolean =>
  normalizeVersion(frontend.build.version) === normalizeVersion(backend.build.version)
