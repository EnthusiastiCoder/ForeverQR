import type { APIRoute } from 'astro';

// Built from `site` (SITE_URL in astro.config.mjs) so the domain lives in one place.
export const GET: APIRoute = ({ site }) =>
  new Response(`User-agent: *\nAllow: /\n\nSitemap: ${new URL('sitemap-index.xml', site).href}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
