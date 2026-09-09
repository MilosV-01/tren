import { APP_URL, AUTH_COOKIE } from './config';

const WEEK_SECONDS = 60 * 60 * 24 * 7;

/**
 * Options for the organizer auth cookie.
 *
 * `secure` is derived from the app's own URL scheme, NOT NODE_ENV: `next start`
 * forces NODE_ENV=production even for a local http:// run, and a Secure cookie
 * is silently dropped over http. So: https app URL => Secure, http => not.
 */
export const authCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: WEEK_SECONDS,
  secure: APP_URL.startsWith('https://'),
};

export { AUTH_COOKIE };
