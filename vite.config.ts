/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const THEME_COLOR = '#0B0D12';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // Show an in-app "Update available" toast instead of reloading under the user.
      registerType: 'prompt',
      injectRegister: false, // registered from React via `virtual:pwa-register/react`
      // Icons, favicon, apple-touch-icon and iOS splash screens are generated at
      // build time from public/logo.svg (see pwa-assets.config.ts) and their
      // <link> tags are injected into index.html automatically.
      pwaAssets: {
        config: true,
        overrideManifestIcons: true,
      },
      manifest: {
        id: '/',
        name: 'Loop Habit Tracker',
        short_name: 'Loop Habits',
        description: 'Track your habits offline with Loop’s proven habit-strength score.',
        lang: 'en',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: THEME_COLOR,
        theme_color: THEME_COLOR,
        categories: ['productivity', 'lifestyle', 'health'],
      },
      workbox: {
        // Precache the entire app shell so it boots with zero network.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2,webmanifest}'],
        // iOS fetches splash screens only at install time — keep them out of the precache.
        globIgnores: ['**/apple-splash-*.png'],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        runtimeCaching: [
          {
            // Static media / fonts: immutable → CacheFirst.
            urlPattern: ({ request }) => ['image', 'font'].includes(request.destination),
            handler: 'CacheFirst',
            options: {
              cacheName: 'static-media',
              expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Anything else same-origin (scripts/styles not in precache, manifest):
            // serve instantly from cache, refresh in the background.
            urlPattern: ({ request, sameOrigin }) =>
              sameOrigin && ['script', 'style', 'manifest', 'worker'].includes(request.destination),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'app-assets',
              expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
        type: 'module',
      },
    }),
  ],
  build: {
    target: ['es2020', 'safari15'],
    sourcemap: false,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
