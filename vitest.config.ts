import { defineConfig } from 'vitest/config';

// Separate from vite.config.ts: the tests need neither the SEO pages nor the changelog check.
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify('test'),
  },
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
