export interface BuildMetadata {
  version: string;
  commit: string;
}

export const frontendBuildMetadata: BuildMetadata = {
  version: __BUILD_VERSION__,
  commit: __BUILD_COMMIT__,
};

const normalizeReleaseCandidateVersion = (version: string): string =>
  version.replace(/-rc\d+(?=\+?$)/i, '');

export const isBuildMetadataMatch = (
  frontend: BuildMetadata,
  backend: BuildMetadata
): boolean =>
  normalizeReleaseCandidateVersion(frontend.version) === normalizeReleaseCandidateVersion(backend.version)
