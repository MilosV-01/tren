import Link from 'next/link';
import type { EventWithStatsDto } from '@tren/shared';
import { serverApi } from '@/lib/server-api';
import { formatDate, eventTypeLabel } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const events = await serverApi<EventWithStatsDto[]>('/events');

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-surface-900">Događaji</h1>
          <p className="mt-1 text-sm text-surface-600">{events.length} ukupno</p>
        </div>
        <Link href="/dashboard/events/new" className="btn-primary">
          Novi događaj
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="card mt-8 text-center">
          <p className="text-surface-700">Još nemaš nijedan događaj.</p>
          <Link href="/dashboard/events/new" className="btn-primary mt-4">
            Napravi prvi događaj
          </Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {events.map((event) => (
            <li key={event.id}>
              <Link
                href={`/dashboard/events/${event.id}`}
                className="card flex flex-col gap-3 transition-colors hover:border-primary-300 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold text-surface-900">{event.title}</h2>
                    <span className="rounded-full bg-surface-100 px-2 py-0.5 text-xs text-surface-600">
                      {eventTypeLabel(event.eventType)}
                    </span>
                    {event.packageTier === 'premium' && (
                      <span className="rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-700">
                        Premium
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-surface-500">
                    {formatDate(event.eventDate)} · {event.visibility === 'pin_protected' ? 'PIN zaštićena' : 'javna'} galerija
                  </p>
                </div>
                <div className="flex gap-6 text-sm">
                  <Stat label="Fotke / video" value={event.stats.mediaCount} />
                  <Stat label="Gostiju" value={event.stats.guestCount} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-right">
      <div className="text-lg font-semibold text-surface-900">{value}</div>
      <div className="text-xs text-surface-500">{label}</div>
    </div>
  );
}
