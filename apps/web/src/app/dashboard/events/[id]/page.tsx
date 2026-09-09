import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { EventWithStatsDto } from '@tren/shared';
import { serverApi } from '@/lib/server-api';
import { ApiError } from '@/lib/api-error';
import { formatDate, formatDateTime, eventTypeLabel, relativeFromNow } from '@/lib/format';
import { QrShareCard } from '@/components/qr-share-card';
import { DeleteEventButton } from '@/components/delete-event-button';

export const dynamic = 'force-dynamic';

export default async function EventDetailPage({ params }: { params: { id: string } }) {
  let event: EventWithStatsDto;
  try {
    event = await serverApi<EventWithStatsDto>(`/events/${params.id}`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  const expired = new Date(event.expiresAt).getTime() < Date.now();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard" className="text-sm text-surface-500 hover:text-surface-800">
          ← Nazad na događaje
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-surface-900">{event.title}</h1>
            <p className="mt-1 text-sm text-surface-600">
              {formatDate(event.eventDate)} · {eventTypeLabel(event.eventType)} ·{' '}
              {event.packageTier === 'premium' ? 'Premium' : 'Free'} paket
            </p>
          </div>
          <div className="flex gap-2">
            <Link href={`/e/${event.gallerySlug}/gallery`} className="btn-secondary text-sm">
              Otvori galeriju
            </Link>
            <Link href={`/e/${event.gallerySlug}`} className="btn-primary text-sm">
              Stranica za goste
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Fotke + video" value={event.stats.mediaCount} />
        <StatCard label="Fotografije" value={event.stats.photoCount} />
        <StatCard label="Video" value={event.stats.videoCount} />
        <StatCard label="Gostiju" value={event.stats.guestCount} />
      </div>

      <QrShareCard slug={event.gallerySlug} fallbackUrl={event.shareUrl} />

      <div className="card space-y-2 text-sm">
        <Row label="Pristup galeriji">
          {event.visibility === 'pin_protected' ? 'PIN zaštićena' : 'Javna'}
        </Row>
        <Row label="Period čuvanja">{event.retentionDays} dana</Row>
        <Row label={expired ? 'Isteklo' : 'Ističe'}>
          {formatDateTime(event.expiresAt)} ({relativeFromNow(event.expiresAt)})
        </Row>
        <Row label="Poslednji upload">
          {event.stats.lastUploadAt ? relativeFromNow(event.stats.lastUploadAt) : 'još ništa'}
        </Row>
      </div>

      <div className="flex justify-end">
        <DeleteEventButton eventId={event.id} title={event.title} />
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="card p-4 text-center">
      <div className="text-2xl font-semibold text-surface-900">{value}</div>
      <div className="mt-1 text-xs text-surface-500">{label}</div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-surface-100 py-1.5 last:border-0">
      <span className="text-surface-500">{label}</span>
      <span className="text-right font-medium text-surface-800">{children}</span>
    </div>
  );
}
