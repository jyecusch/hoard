// Post-build service worker generation (run via `npm run build`).
//
// vite-plugin-pwa's own generateSW step doesn't fire under TanStack Start's
// multi-environment build, so we call workbox-build directly against the
// client output. The manifest.webmanifest and icons still come from
// vite-plugin-pwa / public.
import { generateSW } from 'workbox-build'

const dist = new URL('../dist/client/', import.meta.url).pathname

const { count, size, warnings } = await generateSW({
  globDirectory: dist,
  globPatterns: ['**/*.{js,css,html,svg,png,woff2,wasm,webmanifest}'],
  globIgnores: ['sw.js', 'workbox-*.js'],
  swDest: `${dist}sw.js`,
  maximumFileSizeToCacheInBytes: 12 * 1024 * 1024, // the Jazz wasm (~10MB) must precache for offline boot
  clientsClaim: true,
  skipWaiting: true,
  cleanupOutdatedCaches: true,
  // Offline navigation boots the prerendered SPA shell; Jazz data is local.
  navigateFallback: '/_shell.html',
  navigateFallbackDenylist: [/^\/api\//],
  sourcemap: false,
})

for (const warning of warnings) console.warn('[sw]', warning)
console.log(`[sw] precached ${count} files (${(size / 1024 / 1024).toFixed(1)} MB)`)
