import 'server-only';
import { cookies } from 'next/headers';
import { API_INTERNAL_URL, AUTH_COOKIE } from './config';
import { ApiError, messageFromBody } from './api-error';

/**
 * Server-side API call for React Server Components and route handlers. Attaches
 * the organizer JWT from the httpOnly cookie as a Bearer token.
 */
export async function serverApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = cookies().get(AUTH_COOKIE)?.value;
  const res = await fetch(`${API_INTERNAL_URL}/api${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
    cache: 'no-store',
  });

  const body = await parseBody(res);
  if (!res.ok) {
    throw new ApiError(res.status, messageFromBody(body, `Zahtev nije uspeo (${res.status})`), body);
  }
  return body as T;
}

async function parseBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
