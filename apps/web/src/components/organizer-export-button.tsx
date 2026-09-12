'use client';

import { useEffect, useRef, useState } from 'react';
import type { ExportJobDto } from '@tren/shared';
import { organizerApi } from '@/lib/browser-api';
import { ApiError } from '@/lib/api-error';

const POLL_MS = 2000;

/** Organizer-only "download everything" — the guest gallery no longer offers
 *  this since each guest only ever sees their own photos. */
export function OrganizerExportButton({ eventId, disabled }: { eventId: string; disabled?: boolean }) {
  const [job, setJob] = useState<ExportJobDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => clearTimeout(timer.current), []);

  useEffect(() => {
    if (!job || job.status === 'ready' || job.status === 'failed') return;
    timer.current = setTimeout(async () => {
      try {
        const next = await organizerApi<ExportJobDto>(`/events/${eventId}/exports/${job.id}`);
        setJob(next);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Greška pri proveri statusa.');
      }
    }, POLL_MS);
    return () => clearTimeout(timer.current);
  }, [job, eventId]);

  async function start() {
    setStarting(true);
    setError(null);
    try {
      const created = await organizerApi<ExportJobDto>(`/events/${eventId}/exports`, { method: 'POST' });
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
        <span className="text-xs text-danger-600">
          {error ?? job?.error ?? 'Preuzimanje nije uspelo.'}
        </span>
      )}
    </div>
  );
}
