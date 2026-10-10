import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import tailwindcss from '@tailwindcss/vite';
import pwa from '@vite-pwa/astro';

// https://astro.build/config
export default defineConfig({
  // SSR penuh: cookie auth + proxy API harus dieksekusi di server.
  output: 'server',
  adapter: node({ mode: 'standalone' }),

  // Proteksi CSRF Astro (checkOrigin) membandingkan header Origin dengan
  // origin URL request. Tanpa allowedDomains, adapter standalone menghitung
  // origin sebagai "http://localhost" (tanpa port) sehingga POST form dari
  // browser selalu ditolak 403. Daftarkan host yang diizinkan (tambahkan
  // domain production saat deploy).
  security: {
    checkOrigin: true,
    allowedDomains: [
      { hostname: 'localhost', port: '4321' },
      { hostname: '127.0.0.1', port: '4321' },
    ],
  },

  // PWA: manifest + service worker (pengganti @astrojs/pwa yang deprecated).
  integrations: [
    pwa({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'Caupocket',
        short_name: 'Caupocket',
        description: 'Pencatat keuangan & perencana tabungan pribadi',
        lang: 'id',
        dir: 'ltr',
        theme_color: '#4f46e5',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/dashboard',
        scope: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // Halaman di-render SSR sehingga tidak ada app-shell yang bisa
        // di-precache; navigasi di-cache saat runtime (NetworkFirst) agar
        // UI dasar tetap tersedia saat offline.
        navigateFallback: null,
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'caupocket-pages',
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 32, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/_astro/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'caupocket-assets',
              expiration: { maxEntries: 64, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],

  vite: {
    plugins: [tailwindcss()],
  },
});
