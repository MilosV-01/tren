'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { MediaItemDto, Paginated, PublicEventDto } from '@tren/shared';
import { publicApi } from '@/lib/browser-api';
import { ApiError } from '@/lib/api-error';
import { getGalleryAccess, clearGalleryAccess } from '@/lib/guest-session';
import { formatDate, relativeFromNow } from '@/lib/format';
import { PinGate } from './pin-gate';
import { ExportButton } from './export-button';

const PAGE_SIZE = 24;
type Phase = 'checking' | 'locked' | 'ready' | 'error';

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
    async (token: string | undefined) => {
      setPhase('checking');
      try {
        const page = await fetchPage(token, null);
        setItems(page.items);
        setCursor(page.nextCursor);
        setAccess(token);
        setPhase('ready');
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
    if (event.visibility === 'public') {
      void loadFirst(undefined);
    } else {
      const token = getGalleryAccess(slug);
      if (token) void loadFirst(token);
      else setPhase('locked');
    }
  }, [event.visibility, slug, loadFirst]);

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

  if (phase === 'checking') {
    return <p className="py-16 text-center text-sm text-surface-500">Učitavanje…</p>;
  }

  if (phase === 'locked') {
    return <PinGate slug={slug} onUnlocked={() => loadFirst(getGalleryAccess(slug) ?? undefined)} />;
  }

  if (phase === 'error') {
    return <p className="py-16 text-center text-sm text-primary-700">{errorMsg}</p>;
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
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
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {items.map((item) => (
            <MediaTile key={item.id} item={item} onOpen={() => setLightbox(item)} />
          ))}
        </div>
      )}

      <div ref={sentinel} className="h-8" />
      {loadingMore && (
        <p className="py-4 text-center text-xs text-surface-400">Učitavam još…</p>
      )}
      {!cursor && items.length > PAGE_SIZE && (
        <p className="py-4 text-center text-xs text-surface-400">To je sve 🎉</p>
      )}

      {lightbox && <Lightbox item={lightbox} onClose={() => setLightbox(null)} />}
    </div>
  );
}

function MediaTile({ item, onOpen }: { item: MediaItemDto; onOpen: () => void }) {
  if (item.type === 'video') {
    return (
      <video
        src={item.url}
        className="aspect-square w-full rounded-lg bg-surface-100 object-cover"
        controls
        preload="metadata"
        playsInline
      />
    );
  }
  return (
    <button
      onClick={onOpen}
      className="group relative aspect-square overflow-hidden rounded-lg bg-surface-100"
      aria-label={`Fotografija — ${item.guestName}`}
    >
      <img
        src={item.thumbnailUrl}
        loading="lazy"
        alt=""
        className="h-full w-full object-cover transition-transform group-hover:scale-105"
      />
    </button>
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
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-4"
      onClick={onClose}
    >
      <img
        src={item.url}
        alt=""
        className="max-h-[85vh] max-w-full rounded-lg object-contain"
        onClick={(e) => e.stopPropagation()}
      />
      <p className="mt-3 text-center text-sm text-white/80">
        {item.guestName} · {relativeFromNow(item.createdAt)}
      </p>
    </div>
  );
}

export function GalleryHeader({ event }: { event: PublicEventDto }) {
  return (
    <header className="mb-6 text-center">
      <h1 className="text-2xl font-semibold text-surface-900">{event.title}</h1>
      <p className="mt-1 text-sm text-surface-500">
        {formatDate(event.eventDate)} · galerija
      </p>
    </header>
  );
}
