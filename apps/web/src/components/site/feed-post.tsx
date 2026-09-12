'use client';

import { useEffect } from 'react';
import type { MediaItemDto } from '@tren/shared';
import { relativeFromNow } from '@/lib/format';

/** Instagram-profile-style grid: tight 3-column squares, tap to open the full
 *  view. Shared by the guest's own-photos feed and the organizer's full-event
 *  feed. */
export function ProfileGrid({
  items,
  onOpen,
}: {
  items: MediaItemDto[];
  onOpen: (item: MediaItemDto) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-0.5">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onOpen(item)}
          className="group relative aspect-square overflow-hidden bg-surface-100"
          aria-label={`Fotografija — ${item.guestName}`}
        >
          <img
            src={item.thumbnailUrl}
            loading="lazy"
            alt=""
            className="h-full w-full object-cover transition group-active:scale-95"
          />
          {item.type === 'video' && (
            <svg
              viewBox="0 0 20 20"
              fill="white"
              className="absolute right-1.5 top-1.5 h-4 w-4 drop-shadow"
              aria-hidden="true"
            >
              <path d="M5 3.5c0-.9.98-1.45 1.75-.99l9.5 5.5a1.14 1.14 0 0 1 0 1.98l-9.5 5.5C5.98 16.45 5 15.9 5 15V3.5Z" />
            </svg>
          )}
        </button>
      ))}
    </div>
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
      {item.type === 'video' ? (
        <video
          src={item.url}
          className="max-h-[80vh] max-w-full rounded-lg object-contain"
          controls
          autoPlay
          playsInline
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <img
          src={item.url}
          alt=""
          className="max-h-[80vh] max-w-full rounded-lg object-contain"
          onClick={(e) => e.stopPropagation()}
        />
      )}
      <div
        className="mt-3 flex items-center gap-3 text-sm text-surface-50/80"
        onClick={(e) => e.stopPropagation()}
      >
        <span>
          {item.guestName} · {relativeFromNow(item.createdAt)}
        </span>
        <a
          href={item.downloadUrl}
          download
          className="flex items-center gap-1 rounded-full bg-surface-50/10 px-3 py-1.5 text-surface-50 hover:bg-surface-50/20"
        >
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4">
            <path d="M10 3v9m0 0 3.5-3.5M10 12l-3.5-3.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4 14.5V16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Preuzmi
        </a>
      </div>
    </div>
  );
}
