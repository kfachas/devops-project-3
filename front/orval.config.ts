import { defineConfig } from 'orval';

export default defineConfig({
  datashare: {
    input: {
      target: '../docs/openapi.json',
    },
    output: {
      mode: 'tags',
      target: './src/api',
      schemas: './src/api/models',
      client: 'react-query',
      httpClient: 'axios',
      clean: true,
      prettier: true,
      override: {
        mutator: { path: './src/core/api-client.ts', name: 'customInstance' },
      },
    },
  },
});
