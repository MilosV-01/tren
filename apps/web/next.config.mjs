import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

/**
 * The web app reads its config from the repo-root `.env` (see .env.example).
 * Next only auto-loads env files inside the app dir, so we parse the root file
 * here and merge anything not already set in the environment.
 */
const rootEnvPath = resolve(dirname(fileURLToPath(import.meta.url)), '../../.env');
try {
  const raw = readFileSync(rootEnvPath, 'utf8');
  for (const line of raw.split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const [, key, value] = m;
    if (process.env[key] === undefined) {
      process.env[key] = value.replace(/^["']|["']$/g, '');
    }
  }
} catch {
  // No root .env (e.g. CI with real env vars) — that's fine.
}

// Render's blueprint `fromService` provides bare hostnames — add the scheme.
const withScheme = (v, fallback) => {
  const s = (v ?? '').trim();
  if (!s) return fallback;
  return /^https?:\/\//.test(s) ? s : `https://${s}`;
};

const API_URL = withScheme(process.env.NEXT_PUBLIC_API_URL, 'http://localhost:4000');
const APP_URL = withScheme(process.env.NEXT_PUBLIC_APP_URL, 'http://localhost:3000');
const SITE_URL = withScheme(process.env.NEXT_PUBLIC_SITE_URL, 'https://tren.rs');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@tren/shared'],
  env: {
    NEXT_PUBLIC_API_URL: API_URL,
    NEXT_PUBLIC_APP_URL: APP_URL,
    // Canonical site URL for SEO (metadataBase / sitemap / OG). Real domain in prod.
    NEXT_PUBLIC_SITE_URL: SITE_URL,
    // Server-only: URL the Next server uses to reach the API.
    API_INTERNAL_URL: withScheme(process.env.API_INTERNAL_URL, API_URL),
  },
};

export default nextConfig;
