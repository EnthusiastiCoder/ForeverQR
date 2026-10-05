# ForeverQR


Live: https://foreverqr-anu.pages.dev
A free QR code studio that makes codes that never expire, plus a checker that tells you whether
someone else's code will. Everything runs in your browser.

## Privacy promise

No back end, no analytics, no third-party requests. Fonts, scripts and the QR decoder are all served
from the site itself, and a Content Security Policy (`connect-src 'self'`) enforces it.

To verify: open DevTools, go to the Network tab, reload any page and use the studio or checker. Every
request is to the site's own origin. The footer meter shows the same count. Settings are kept only in
`localStorage` (key `fqr:v1`).

## Features

- Static codes for URL, WiFi, vCard, Email, SMS, Location, Event and Text
- Colours, gradients, dot and eye styles, frames, logo upload, presets
- Live scan check (the code is decoded again to prove it reads)
- SVG, PNG and PDF export
- Expiry checker: upload, paste or scan a code and see if it is static, direct, dynamic or behind a shortener
- Installable, works offline after the first visit
- 11 SEO landing pages, sitemap, FAQ structured data

## Stack

Astro, Svelte 5, Tailwind CSS 4, qrcode-generator, zxing-wasm, pdf-lib, opentype.js, @vite-pwa/astro.

## Licences

See `THIRD_PARTY_LICENSES.md` (also shown on the /about/ page). The project itself is all rights
reserved for now: see `COPYRIGHT`.

## Development

```
npm install
npm run dev            # dev server
npm run build          # build to dist/ and write CSP script hashes
npm run preview        # serve dist/ with production headers on port 4391
npm test               # unit tests (vitest)
npm run check:dist     # fail if the build loads anything from another origin
npm run check:licenses # licence allowlist for production dependencies
npm run test:e2e       # Playwright (chromium full, firefox and webkit smoke, mobile)
```

`node scripts/make-og.mjs` regenerates `public/og/*.png`.
