import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { secretGuard } from './build/secretGuard'

export default defineConfig(({ mode }) => {
  // Vercel sets VERCEL_GIT_COMMIT_SHA during its builds; shown in Settings and Admin so "is my phone
  // running the latest version?" can be answered.
  const env = loadEnv(mode, '.', '')
  const version = { sha: (env['VERCEL_GIT_COMMIT_SHA'] ?? 'local').slice(0, 7), builtAt: new Date().toISOString() }

  return {
    // Only these prefixes are written into the public website. Never add 'SUPABASE_': that is where
    // Supabase's Vercel integration puts the secret key. secretGuard stops the build if one slips in.
    envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
    define: { __APP_VERSION__: JSON.stringify(version) },
    plugins: [
      secretGuard(),
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icon.svg'],
        manifest: {
          name: 'SSM Travel & Tours Co., Ltd.',
          short_name: 'SSM Travel',
          description: 'India & Bhutan travel, visa, passport and air-ticket operations',
          theme_color: '#0f766e',
          background_color: '#f8fafc',
          display: 'standalone',
          start_url: '/',
          icons: [
            { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
            { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
          maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/[abc]\.tile\.openstreetmap\.org\/.*/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'osm-tiles',
                expiration: { maxEntries: 600, maxAgeSeconds: 60 * 60 * 24 * 60 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
      }),
    ],
    test: { environment: 'node' },
  }
})
