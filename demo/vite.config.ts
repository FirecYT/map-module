import { defineConfig } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      // Resolving the module from source for development.
      // This avoids the need to rebuild the module every time.
      '@firec/map-module': path.resolve(__dirname, '../src/index.ts'),
    },
  },
  server: {
    open: true,
  },
  build: {
    target: 'es2020',
  },
});
