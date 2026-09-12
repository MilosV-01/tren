'use client';

import { useEffect } from 'react';
import type { MediaItemDto } from '@tren/shared';
import { relativeFromNow } from '@/lib/format';

/** One Instagram-style feed post: small avatar + name + time, full-width media.
 *  Shared by the guest's own-photos feed and the organizer's full-event feed. */
export function FeedPost({ item, onOpen }: { item: MediaItemDto; onOpen: () => void }) {
  const initial = item.guestName.trim().charAt(0).toUpperCase() || '?';
  return (
    <article className="py-4 first:pt-0">
      <div className="mb-2.5 flex items-center gap-2.5 px-0.5">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary-900 font-serif text-sm text-surface-50">
          {initial}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-surface-900">{item.guestName}</p>
          <p className="text-xs text-surface-500">{relativeFromNow(item.createdAt)}</p>
        </div>
      </div>
      {item.type === 'video' ? (
        <video
          src={item.url}
          className="aspect-[4/5] w-full rounded-xl bg-surface-100 object-cover"
          controls
          preload="metadata"
          playsInline
        />
      ) : (
        <button onClick={onOpen} className="block w-full" aria-label={`Fotografija — ${item.guestName}`}>
          <img
            src={item.thumbnailUrl}
            loading="lazy"
            alt=""
            className="aspect-[4/5] w-full rounded-xl object-cover"
          />
        </button>
      )}
    </article>
  );
}

export function FeedLightbox({ item, onClose }: { item: MediaItemDto; onClose: () => void }) {
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
