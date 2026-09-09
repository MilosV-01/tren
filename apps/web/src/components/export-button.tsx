'use client';

import { useEffect, useRef, useState } from 'react';
import type { ExportJobDto } from '@tren/shared';
import { publicApi } from '@/lib/browser-api';
import { ApiError } from '@/lib/api-error';

const POLL_MS = 2000;

export function ExportButton({
  slug,
  galleryAccess,
  disabled,
}: {
  slug: string;
  galleryAccess?: string;
  disabled?: boolean;
}) {
  const [job, setJob] = useState<ExportJobDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => clearTimeout(timer.current), []);

  useEffect(() => {
    if (!job || job.status === 'ready' || job.status === 'failed') return;
    timer.current = setTimeout(async () => {
      try {
        const next = await publicApi<ExportJobDto>(
          `/public/events/${slug}/exports/${job.id}`,
          { galleryAccess },
        );
        setJob(next);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Greška pri proveri statusa.');
      }
    }, POLL_MS);
    return () => clearTimeout(timer.current);
  }, [job, slug, galleryAccess]);

  async function start() {
    setStarting(true);
    setError(null);
    try {
      const created = await publicApi<ExportJobDto>(`/public/events/${slug}/exports`, {
        method: 'POST',
        galleryAccess,
      });
      setJob(created);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Ne mogu da pokrenem preuzimanje.');
    } finally {
      setStarting(false);
    }
  }

  if (job?.status === 'ready' && job.downloadUrl) {
    return (
      <a href={job.downloadUrl} className="btn-primary text-sm" download>
        Preuzmi ZIP ({job.fileCount})
      </a>
    );
  }

  const working = job && (job.status === 'pending' || job.status === 'processing');

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        className="btn-secondary text-sm"
        onClick={start}
        disabled={disabled || starting || Boolean(working)}
      >
        {working
          ? `Pripremam ZIP… ${job?.progress ?? 0}%`
          : starting
            ? 'Pokrećem…'
            : 'Preuzmi sve (ZIP)'}
      </button>
      {(error || job?.status === 'failed') && (
        <span className="text-xs text-primary-700">
          {error ?? job?.error ?? 'Preuzimanje nije uspelo.'}
        </span>
      )}
    </div>
  );
}
