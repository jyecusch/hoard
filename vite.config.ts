import { defineConfig } from 'vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { jazzPlugin } from 'jazz-tools/dev/vite'
import { VitePWA } from 'vite-plugin-pwa'

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  // The build's SPA-shell prerender step boots `vite preview` and fetches it
  // via 127.0.0.1; pin the bind address so that works in IPv6-less/IPv6-first
  // environments (e.g. Docker builds). No effect on `npm run dev`.
  preview: { host: '127.0.0.1' },
  plugins: [
    tailwindcss(),
    jazzPlugin({
      // Production builds (JAZZ_BUILD_STATIC=1, set by deploy/Dockerfile.app)
      // must not start the embedded dev sync server: `server: false` disables
      // the plugin and VITE_JAZZ_APP_ID / VITE_JAZZ_SERVER_URL are taken from
      // the build environment instead. Dev behaviour is unchanged.
      server:
        process.env.JAZZ_BUILD_STATIC === '1'
          ? false
          : {
              // Validate external JWTs against Better Auth's JWKS endpoint,
              // served by this same app (see src/lib/auth.ts).
              jwksUrl: 'http://localhost:4300/api/auth/jwks',
            },
    }),
    tanstackStart({
      spa: {
        enabled: true,
      },
    }),
    viteReact(),
    VitePWA({
      // Only the manifest comes from this plugin. Its generateSW step doesn't
      // fire under Start's multi-environment build, so the service worker is
      // produced post-build by scripts/generate-sw.mjs, and registration
      // happens manually in __root.tsx.
      injectRegister: null,
      manifest: {
        name: 'Hoard',
        short_name: 'Hoard',
        description: 'Local-first home inventory: label it, box it, find it again.',
        theme_color: '#f6f3ed',
        background_color: '#f6f3ed',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/pwa-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
})

export default config
