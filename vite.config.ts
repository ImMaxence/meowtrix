import { defineConfig } from 'vite';
import pkg from './package.json' with { type: 'json' };
import { seoPages } from './seo/plugin.ts';

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [seoPages(pkg.version)],
  build: {
    // Smart TVs often ship older browser engines.
    target: 'es2020',
    // three.js alone is ~550 kB minified: in its own chunk, it stays cached from one version of
    // Meowtrix to the next.
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks: (id) => (id.includes('node_modules/three/') ? 'three' : undefined),
      },
    },
  },
});
