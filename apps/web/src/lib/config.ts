/** Prefix a bare `host.tld` with https:// (Render blueprint `fromService` gives
 *  hostnames without a scheme). Leaves full URLs untouched. */
function withScheme(value: string | undefined, fallback: string): string {
  const v = (value ?? '').trim();
  if (!v) return fallback;
  return /^https?:\/\//.test(v) ? v : `https://${v}`;
}

/** Browser-visible API base. Kept for reference; client calls go through the
 *  same-origin proxies (`/api/proxy/*`, `/api/pub/*`). */
export const API_URL = withScheme(process.env.NEXT_PUBLIC_API_URL, 'http://localhost:4000');

/** Base URL this web app is actually served from at runtime. */
export const APP_URL = withScheme(process.env.NEXT_PUBLIC_APP_URL, 'http://localhost:3000');

/** Canonical public site URL, used only for SEO (metadataBase, sitemap, OG). */
export const SITE_URL = withScheme(
  process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL,
  'https://tren.rs',
).replace(/\/$/, '');

/** URL the Next server uses to reach the API (server components + proxies). */
export const API_INTERNAL_URL = withScheme(process.env.API_INTERNAL_URL, API_URL);

/** httpOnly cookie holding the organizer JWT. Set by the auth route handlers. */
export const AUTH_COOKIE = 'tren_token';

/** Public brand constants surfaced across the marketing pages. */
export const BRAND = {
  name: 'Tren',
  tagline: 'Sve fotografije sa vašeg događaja, na jednom mestu',
  email: 'zdravo@tren.rs',
} as const;
