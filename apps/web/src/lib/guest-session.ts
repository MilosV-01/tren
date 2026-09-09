'use client';

import type { GuestSessionDto } from '@tren/shared';

/**
 * Guest identity + gallery-unlock state live only in the guest's own browser
 * (localStorage), namespaced per event slug. Nothing here is sent anywhere
 * except back to the API as the `x-guest-session` / `x-gallery-access` headers.
 */
const guestKey = (slug: string) => `tren:guest:${slug}`;
const galleryKey = (slug: string) => `tren:gallery:${slug}`;

export function getGuestSession(slug: string): GuestSessionDto | null {
  return read<GuestSessionDto>(guestKey(slug));
}

export function saveGuestSession(slug: string, session: GuestSessionDto): void {
  write(guestKey(slug), session);
}

export function clearGuestSession(slug: string): void {
  safe(() => localStorage.removeItem(guestKey(slug)));
}

export function getGalleryAccess(slug: string): string | null {
  const entry = read<{ token: string; expiresAt: number }>(galleryKey(slug));
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    clearGalleryAccess(slug);
    return null;
  }
  return entry.token;
}

export function saveGalleryAccess(slug: string, token: string, expiresInSeconds: number): void {
  write(galleryKey(slug), { token, expiresAt: Date.now() + expiresInSeconds * 1000 });
}

export function clearGalleryAccess(slug: string): void {
  safe(() => localStorage.removeItem(galleryKey(slug)));
}

function read<T>(key: string): T | null {
  return safe(() => {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  }, null);
}

function write(key: string, value: unknown): void {
  safe(() => localStorage.setItem(key, JSON.stringify(value)));
}

function safe<T>(fn: () => T, fallback: T | null = null): T | null {
  try {
    return fn();
  } catch {
    return fallback;
  }
}
