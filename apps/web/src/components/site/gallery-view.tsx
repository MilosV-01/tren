'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { GuestSessionDto, MediaItemDto, Paginated, PublicEventDto } from '@tren/shared';
import { publicApi } from '@/lib/browser-api';
import { ApiError } from '@/lib/api-error';
import { getGalleryAccess, clearGalleryAccess, getGuestSession, clearGuestSession } from '@/lib/guest-session';
import { formatDate } from '@/lib/format';
import { PinGate } from '../pin-gate';
import { NameForm } from './name-form';
import { ProfileGrid, FeedLightbox } from './feed-post';
import { Wordmark } from './logo';

const PAGE_SIZE = 24;
const revealedKey = (slug: string) => `tren:revealed:${slug}`;

type Phase = 'checking' | 'locked' | 'join' | 'developing' | 'reveal' | 'ready' | 'error';

export function GalleryView({ event }: { event: PublicEventDto }) {
  const slug = event.gallerySlug;
  const [phase, setPhase] = useState<Phase>('checking');
  const [access, setAccess] = useState<string | undefined>(undefined);
  const [guestToken, setGuestToken] = useState<string | undefined>(undefined);
  const [items, setItems] = useState<MediaItemDto[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<MediaItemDto | null>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  // Held while we wait for the guest to give their name, so we can resume
  // exactly the load that triggered the join screen.
  const pending = useRef<{ access: string | undefined; skipDeveloping: boolean }>({
    access: undefined,
    skipDeveloping: true,
  });

  const alreadyRevealed = useCallback(() => {
    try {
      return localStorage.getItem(revealedKey(slug)) === '1';
    } catch {
      return true; // fail open — never trap a viewer behind the reveal screen
    }
  }, [slug]);

  const fetchPage = useCallback(
    async (accessToken: string | undefined, guest: string, next: string | null) => {
      const qs = new URLSearchParams({ limit: String(PAGE_SIZE) });
      if (next) qs.set('cursor', next);
      return publicApi<Paginated<MediaItemDto>>(
        `/public/events/${slug}/media?${qs.toString()}`,
        { galleryAccess: accessToken, guestSession: guest },
      );
    },
    [slug],
  );

  const loadFirst = useCallback(
    async (accessToken: string | undefined, guest: string, skipDeveloping: boolean) => {
      setPhase(skipDeveloping ? 'checking' : 'developing');
      try {
        const page = await fetchPage(accessToken, guest, null);
        setItems(page.items);
        setCursor(page.nextCursor);
        setAccess(accessToken);
        setGuestToken(guest);
        setPhase(skipDeveloping ? 'ready' : 'reveal');
      } catch (err) {
        if (err instanceof ApiError && (err.status === 403 || err.status === 401)) {
          clearGalleryAccess(slug);
          clearGuestSession(slug);
          setPhase(event.visibility === 'pin_protected' ? 'locked' : 'join');
          return;
        }
        setErrorMsg(err instanceof ApiError ? err.message : 'Galerija se ne učitava.');
        setPhase('error');
      }
    },
    [fetchPage, slug, event.visibility],
  );

  /** Loads the guest's session (joining if needed) then continues to `loadFirst`. */
  const proceed = useCallback(
    (accessToken: string | undefined, skipDeveloping: boolean) => {
      const session = getGuestSession(slug);
      if (!session) {
        pending.current = { access: accessToken, skipDeveloping };
        setPhase('join');
        return;
      }
      void loadFirst(accessToken, session.sessionToken, skipDeveloping);
    },
    [slug, loadFirst],
  );

  useEffect(() => {
    const skipDeveloping = alreadyRevealed();
    if (event.visibility === 'public') {
      proceed(undefined, skipDeveloping);
    } else {
      const token = getGalleryAccess(slug);
      if (token) proceed(token, skipDeveloping);
      else setPhase('locked');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.visibility, slug]);

  function onJoined(session: GuestSessionDto) {
    void loadFirst(pending.current.access, session.sessionToken, pending.current.skipDeveloping);
  }

  const loadMore = useCallback(async () => {
    if (!cursor || loadingMore || !guestToken) return;
    setLoadingMore(true);
    try {
      const page = await fetchPage(access, guestToken, cursor);
      setItems((prev) => [...prev, ...page.items]);
      setCursor(page.nextCursor);
    } catch {
      /* keep what we have; the sentinel will retry on next scroll */
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, loadingMore, access, guestToken, fetchPage]);

  useEffect(() => {
    const node = sentinel.current;
    if (!node || phase !== 'ready') return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) void loadMore();
      },
      { rootMargin: '600px' },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [phase, loadMore]);

  function reveal() {
    try {
      localStorage.setItem(revealedKey(slug), '1');
    } catch {
      /* best-effort */
    }
    setPhase('ready');
  }

  if (phase === 'checking') {
    return <p className="py-16 text-center text-sm text-surface-500">Učitavanje…</p>;
  }

  if (phase === 'locked') {
    return (
      <PinGate
        slug={slug}
        onUnlocked={() => proceed(getGalleryAccess(slug) ?? undefined, alreadyRevealed())}
      />
    );
  }

  if (phase === 'join') {
    return (
      <NameForm
        slug={slug}
        onJoined={onJoined}
        heading="Kako se zoveš?"
        hint="Vidiš samo fotografije koje si ti okinuo/la — ime nam treba da znamo koje su tvoje."
        submitLabel="Pogledaj svoje fotografije"
      />
    );
  }

  if (phase === 'error') {
    return <p className="py-16 text-center text-sm text-danger-600">{errorMsg}</p>;
  }

  if (phase === 'developing') {
    return (
      <div className="flex flex-col items-center gap-6 py-10 text-center">
        <p className="wordmark text-2xl">Razvijanje…</p>
        <div className="space-y-1 font-serif text-lg text-primary-900">
          <p>{event.title}</p>
          <p className="text-base text-surface-600">{event.guestCount} gostiju</p>
          <p className="text-base text-surface-600">{event.mediaCount} trenutka</p>
        </div>
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-surface-300 border-t-primary-800" />
        <p className="font-serif italic text-surface-600">Vaš film se razvija.</p>
      </div>
    );
  }

  if (phase === 'reveal') {
    return (
      <div className="flex flex-col items-center gap-6 py-10 text-center">
        <p className="text-lg text-primary-900">Vaš film je razvijen</p>
        <div className="space-y-1 font-serif text-lg text-primary-900">
          <p>{event.title}</p>
          <p className="text-base text-surface-600">{event.guestCount} gostiju</p>
          <p className="text-base text-surface-600">{event.mediaCount} trenutka</p>
        </div>
        <button className="btn-pill" onClick={reveal}>
          Pogledaj film
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md">
      <p className="mb-4 text-sm text-surface-600">
        Tvoje fotografije ({items.length}
        {cursor ? '+' : ''})
      </p>

      {items.length === 0 ? (
        <div className="card py-16 text-center text-sm text-surface-600">
          {event.isExpired
            ? 'Ovaj događaj je istekao i galerija je ispražnjena.'
            : 'Još nisi okinuo/la nijednu fotografiju — vrati se na kameru i uslikaj prvu!'}
        </div>
      ) : (
        <ProfileGrid items={items} onOpen={setLightbox} />
      )}

      <div ref={sentinel} className="h-8" />
      {loadingMore && <p className="py-4 text-center text-xs text-surface-400">Učitavam još…</p>}
      {!cursor && items.length > PAGE_SIZE && (
        <p className="py-4 text-center text-xs text-surface-400">To je sve za sada 🎞️</p>
      )}

      {lightbox && <FeedLightbox item={lightbox} onClose={() => setLightbox(null)} />}
    </div>
  );
}

export function GalleryHeader({ event }: { event: PublicEventDto }) {
  return (
    <header className="mb-8 text-center">
      <Wordmark className="text-lg" />
      <p className="mt-4 text-sm text-surface-500">{formatDate(event.eventDate)}</p>
      <h1 className="mt-1 font-serif text-3xl text-primary-900">{event.title}</h1>
    </header>
  );
}
