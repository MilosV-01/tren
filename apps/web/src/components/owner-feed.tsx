'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { MediaItemDto, Paginated } from '@tren/shared';
import { organizerApi } from '@/lib/browser-api';
import { ProfileGrid, FeedLightbox } from '@/components/site/feed-post';

const PAGE_SIZE = 24;

/** Organizer-only: every guest's photos for this event, newest first. Unlike
 *  the public gallery (each guest sees only their own shots), the owner sees
 *  the whole roll. */
export function OwnerFeed({ eventId }: { eventId: string }) {
  const [items, setItems] = useState<MediaItemDto[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<MediaItemDto | null>(null);
  const sentinel = useRef<HTMLDivElement>(null);

  const fetchPage = useCallback(
    (next: string | null) => {
      const qs = new URLSearchParams({ limit: String(PAGE_SIZE) });
      if (next) qs.set('cursor', next);
      return organizerApi<Paginated<MediaItemDto>>(`/events/${eventId}/media?${qs.toString()}`);
    },
    [eventId],
  );

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const page = await fetchPage(null);
        if (!alive) return;
        setItems(page.items);
        setCursor(page.nextCursor);
      } catch {
        if (alive) setError('Galerija se ne učitava.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [fetchPage]);

  const loadMore = useCallback(async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await fetchPage(cursor);
      setItems((prev) => [...prev, ...page.items]);
      setCursor(page.nextCursor);
    } catch {
      /* the sentinel will retry on next scroll */
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, loadingMore, fetchPage]);

  useEffect(() => {
    const node = sentinel.current;
    if (!node || loading) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) void loadMore();
      },
      { rootMargin: '600px' },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [loading, loadMore]);

  if (loading) {
    return <p className="py-10 text-center text-sm text-surface-500">Učitavanje…</p>;
  }
  if (error) {
    return <p className="py-10 text-center text-sm text-danger-600">{error}</p>;
  }
  if (items.length === 0) {
    return (
      <div className="card py-16 text-center text-sm text-surface-600">
        Još nema fotografija na ovom događaju.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md">
      <ProfileGrid items={items} onOpen={setLightbox} />
      <div ref={sentinel} className="h-8" />
      {loadingMore && <p className="py-4 text-center text-xs text-surface-400">Učitavam još…</p>}
      {!cursor && items.length > PAGE_SIZE && (
        <p className="py-4 text-center text-xs text-surface-400">To je ceo film 🎞️</p>
      )}
      {lightbox && <FeedLightbox item={lightbox} onClose={() => setLightbox(null)} />}
    </div>
  );
}
