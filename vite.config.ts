import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// `base` is relative so a production build also works when served from a
// subpath (e.g. GitHub Pages) rather than a domain root.
export default defineConfig({
  base: './',
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
