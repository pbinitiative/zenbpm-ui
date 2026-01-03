import { defineConfig } from 'orval';

export default defineConfig({
  zenbpm: {
    input: {
      target: './openapi/api.yaml',
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
