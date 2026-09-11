'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { MediaItemDto, Paginated, PublicEventDto } from '@tren/shared';
import { publicApi } from '@/lib/browser-api';
import { ApiError } from '@/lib/api-error';
import { getGalleryAccess, clearGalleryAccess } from '@/lib/guest-session';
import { formatDate, relativeFromNow } from '@/lib/format';
import { PinGate } from '../pin-gate';
import { ExportButton } from '../export-button';
import { Wordmark } from './logo';

const PAGE_SIZE = 24;
const revealedKey = (slug: string) => `tren:revealed:${slug}`;

type Phase = 'checking' | 'locked' | 'developing' | 'reveal' | 'ready' | 'error';

export function GalleryView({ event }: { event: PublicEventDto }) {
  const slug = event.gallerySlug;
  const [phase, setPhase] = useState<Phase>('checking');
  const [access, setAccess] = useState<string | undefined>(undefined);
  const [items, setItems] = useState<MediaItemDto[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<MediaItemDto | null>(null);
  const sentinel = useRef<HTMLDivElement>(null);

  const alreadyRevealed = useCallback(() => {
    try {
      return localStorage.getItem(revealedKey(slug)) === '1';
    } catch {
      return true; // fail open — never trap a viewer behind the reveal screen
    }
  }, [slug]);

  const fetchPage = useCallback(
    async (token: string | undefined, next: string | null) => {
      const qs = new URLSearchParams({ limit: String(PAGE_SIZE) });
      if (next) qs.set('cursor', next);
      return publicApi<Paginated<MediaItemDto>>(
        `/public/events/${slug}/media?${qs.toString()}`,
        { galleryAccess: token },
      );
    },
    [slug],
  );

  const loadFirst = useCallback(
    async (token: string | undefined, skipDeveloping: boolean) => {
      setPhase(skipDeveloping ? 'checking' : 'developing');
      try {
        const page = await fetchPage(token, null);
        setItems(page.items);
        setCursor(page.nextCursor);
        setAccess(token);
        setPhase(skipDeveloping ? 'ready' : 'reveal');
      } catch (err) {
        if (err instanceof ApiError && (err.status === 403 || err.status === 401)) {
          clearGalleryAccess(slug);
          setPhase('locked');
          return;
        }
        setErrorMsg(err instanceof ApiError ? err.message : 'Galerija se ne učitava.');
        setPhase('error');
      }
    },
    [fetchPage, slug],
  );

  useEffect(() => {
    const skipDeveloping = alreadyRevealed();
    if (event.visibility === 'public') {
      void loadFirst(undefined, skipDeveloping);
    } else {
      const token = getGalleryAccess(slug);
      if (token) void loadFirst(token, skipDeveloping);
      else setPhase('locked');
    }
  }, [event.visibility, slug, loadFirst, alreadyRevealed]);

  const loadMore = useCallback(async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await fetchPage(access, cursor);
      setItems((prev) => [...prev, ...page.items]);
      setCursor(page.nextCursor);
    } catch {
      /* keep what we have; the sentinel will retry on next scroll */
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, loadingMore, access, fetchPage]);

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
        onUnlocked={() => loadFirst(getGalleryAccess(slug) ?? undefined, alreadyRevealed())}
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
      <div className="mb-6 flex items-center justify-between gap-3">
        <p className="text-sm text-surface-600">
          {items.length}
          {cursor ? '+' : ''} {items.length === 1 ? 'stavka' : 'stavki'}
        </p>
        <ExportButton slug={slug} galleryAccess={access} disabled={items.length === 0} />
      </div>

      {items.length === 0 ? (
        <div className="card py-16 text-center text-sm text-surface-600">
          {event.isExpired
            ? 'Ovaj događaj je istekao i galerija je ispražnjena.'
            : 'Još nema fotografija. Budi prvi/a!'}
        </div>
      ) : (
        <div className="space-y-8">
          {items.map((item, i) => (
            <ReelFrame
              key={item.id}
              item={item}
              index={i}
              total={Math.max(event.mediaCount, items.length)}
              onOpen={() => setLightbox(item)}
            />
          ))}
        </div>
      )}

      <div ref={sentinel} className="h-8" />
      {loadingMore && <p className="py-4 text-center text-xs text-surface-400">Učitavam još…</p>}
      {!cursor && items.length > PAGE_SIZE && (
        <p className="py-4 text-center text-xs text-surface-400">To je ceo film 🎞️</p>
      )}

      {lightbox && <Lightbox item={lightbox} onClose={() => setLightbox(null)} />}
    </div>
  );
}

function ReelFrame({
  item,
  index,
  total,
  onOpen,
}: {
  item: MediaItemDto;
  index: number;
  total: number;
  onOpen: () => void;
}) {
  const num = String(index + 1).padStart(String(total).length, '0');
  return (
    <div>
      <p className="mb-2 font-mono text-xs tracking-wide text-surface-400">
        {num}/{total}
      </p>
      {item.type === 'video' ? (
        <video
          src={item.url}
          className="w-full rounded-xl bg-surface-100 object-cover"
          controls
          preload="metadata"
          playsInline
        />
      ) : (
        <button onClick={onOpen} className="block w-full" aria-label={`Fotografija — ${item.guestName}`}>
          <img src={item.thumbnailUrl} loading="lazy" alt="" className="w-full rounded-xl object-cover" />
        </button>
      )}
    </div>
  );
}

function Lightbox({ item, onClose }: { item: MediaItemDto; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-primary-950/95 p-4"
      onClick={onClose}
    >
      <img
        src={item.url}
        alt=""
        className="max-h-[85vh] max-w-full rounded-lg object-contain"
        onClick={(e) => e.stopPropagation()}
      />
      <p className="mt-3 text-center text-sm text-surface-50/80">
        {item.guestName} · {relativeFromNow(item.createdAt)}
      </p>
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
