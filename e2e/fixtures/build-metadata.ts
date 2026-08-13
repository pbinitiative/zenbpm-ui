import { readFileSync } from 'node:fs';

const apiDefinition = readFileSync(new URL('../../openapi/api.yaml', import.meta.url), 'utf8');
const infoSection = apiDefinition.match(/^info:\s*$([\s\S]*?)(?=^\S)/m)?.[1];
const apiVersion = infoSection?.match(/^\s+version:\s*["']?([^\s"'#]+)["']?/m)?.[1];

if (!apiVersion) {
  throw new Error('Could not read the API version from openapi/api.yaml');
}

export const e2eBuildMetadata = {
  version: apiVersion,
  commit: 'abcdef0123456789abcdef0123456789abcdef01',
  branch: 'feat/system-status',
  time: '2026-08-10T08:00:00Z',
} as const;

export const e2eShortCommit = e2eBuildMetadata.commit.slice(0, 12);
