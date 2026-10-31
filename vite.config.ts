import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    // Smart TVs often ship older browser engines.
    target: 'es2020',
    // three.js alone is ~550 kB minified; a single chunk is fine for this app.
    chunkSizeWarningLimit: 800,
  },
});
