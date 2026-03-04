// @ts-check
import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { AstroPWAIntegration } from '@vite-pwa/astro';

// Placeholder until the domain is chosen; the sitemap and canonical URLs derive from it.
export const SITE_URL = 'https://foreverqr.pages.dev';

/**
 * zxing-wasm's default locateFile points at a CDN. The decode worker overrides it with the
 * self-hosted /_astro wasm, but the fallback string would still ship. This rewrites the CDN
 * base to a same-origin path, so the bundle holds no third-party URL and a missed override
 * fails locally instead of calling out.
 * @returns {import('vite').Plugin}
 */
function noZxingCdn() {
  const CDN = /https:\/\/fastly\.jsdelivr\.net\/npm\/zxing-wasm@[^/`'"]+\/dist\//g;
  return {
    name: 'foreverqr:no-zxing-cdn',
    enforce: 'pre',
    transform(code, id) {
      if (!id.includes('zxing-wasm') || !CDN.test(code)) return null;
      CDN.lastIndex = 0;
      return { code: code.replace(CDN, '/_astro/zxing-missing/'), map: null };
    },
  };
}

export default defineConfig({
  site: SITE_URL,
  output: 'static',
  integrations: [
    svelte(),
    sitemap(),
    AstroPWAIntegration({
      registerType: 'autoUpdate',
      injectRegister: false,
      manifest: {
        name: 'ForeverQR: QR codes that never expire',
        short_name: 'ForeverQR',
        theme_color: '#0b6b4f',
        background_color: '#f6f7f4',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      generateSW: {
        globPatterns: ['**/*.{js,css,html,wasm,woff2,ttf,svg,png}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        // Pages are served at /slug/, but the manifest lists them as slug/index.html: give them the trailing
        // slash form (and "/" for the home page, which the navigation fallback needs) so the precache matches the URL a visitor (or the offline fallback) asks for.
        manifestTransforms: [
          (entries) => ({
            manifest: entries.map((e) =>
              /(^|\/)index\.html$/.test(e.url) ? { ...e, url: e.url.replace(/index\.html$/, '') || '/' } : e,
            ),
            warnings: [],
          }),
        ],
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss(), noZxingCdn()],
    worker: { format: 'es', plugins: () => [noZxingCdn()] },
  },
});
