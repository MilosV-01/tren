'use client';

import { ApiError, messageFromBody } from './api-error';

async function request<T>(url: string, init: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });
  const text = await res.text();
  const body = text ? safeJson(text) : null;
  if (!res.ok) {
    throw new ApiError(res.status, messageFromBody(body, `Greška (${res.status})`), body);
  }
  return body as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * Organizer calls from client components. Routed through the same-origin proxy
 * (`/api/proxy/*`) so the httpOnly auth cookie travels automatically and the JWT
 * never touches client JS.
 */
export function organizerApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  return request<T>(`/api/proxy${path}`, init);
}

/**
 * Unauthenticated guest / gallery calls. Routed through the same-origin proxy
 * (`/api/pub/*`) so the guest page works no matter which host it was opened from
 * (localhost, LAN IP, real domain) with zero client config and no CORS.
 */
export function publicApi<T>(
  path: string,
  init: RequestInit & { guestSession?: string; galleryAccess?: string } = {},
): Promise<T> {
  const { guestSession, galleryAccess, ...rest } = init;
  return request<T>(`/api/pub${path}`, {
    ...rest,
    headers: {
      ...(guestSession ? { 'x-guest-session': guestSession } : {}),
      ...(galleryAccess ? { 'x-gallery-access': galleryAccess } : {}),
      ...(rest.headers ?? {}),
    },
  });
}
