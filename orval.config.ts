import { defineConfig } from 'orval';
import transformer from './scripts/openapi-transformer';

export default defineConfig({
  zenbpm: {
    input: {
      target: './openapi/api.yaml',
      // Transform int64 fields to string types for precision safety
      // JavaScript's Number loses precision for integers > 2^53-1
      override: {
        transformer,
      },
    },
    output: {
      mode: 'tags-split',
      target: './src/base/openapi/generated-api',
      schemas: './src/base/openapi/generated-api/schemas',
      client: 'react-query',
      override: {
        mutator: {
          path: './src/base/openapi/axios-instance.ts',
          name: 'customInstance',
        },
        query: {
          useQuery: true,
          useMutation: true,
        },
      },
    },
  },
});
