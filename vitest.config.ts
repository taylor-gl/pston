import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
  plugins: [sveltekit()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/lib/tests/setup.ts'],
    include: ['src/**/*.{test,spec}.{js,ts}'],
  },
});
