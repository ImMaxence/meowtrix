import { defineConfig } from 'vite';
import pkg from './package.json' with { type: 'json' };

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  build: {
    // Smart TVs often ship older browser engines.
    target: 'es2020',
    // three.js alone is ~550 kB minified; a single chunk is fine for this app.
    chunkSizeWarningLimit: 800,
  },
});
