import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// `base` is relative so a production build also works when served from a
// subpath (e.g. GitHub Pages) rather than a domain root.
export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Subscription Tracker',
        short_name: 'Subscriptions',
        description: 'Track recurring subscriptions and fixed-term payment plans.',
        theme_color: '#2f6fed',
        background_color: '#0e1116',
        display: 'standalone',
        orientation: 'portrait',
        start_url: './',
        scope: './',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
        navigateFallback: 'index.html',
        // No runtimeCaching on purpose. Without a matching rule the service
        // worker never calls respondWith for Supabase requests, so they go
        // straight to the network as normal fetches. Adding a NetworkOnly rule
        // would route them *through* the worker for no benefit — an extra hop
        // that makes every API call depend on the worker being healthy. Caching
        // them would be worse still: stale subscription data served behind the
        // app's back beats an honest "Offline" chip only until someone trusts
        // a wrong number.
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
