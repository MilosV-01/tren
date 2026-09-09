'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  EVENT_TYPES,
  PACKAGE_TIERS,
  RETENTION_DAYS,
  createEventSchema,
  type EventType,
  type EventWithStatsDto,
  type PackageTier,
} from '@tren/shared';
import { organizerApi } from '@/lib/browser-api';
import { eventTypeLabel } from '@/lib/format';
import { ApiError } from '@/lib/api-error';

const TIER_LABELS: Record<PackageTier, string> = { free: 'Free', premium: 'Premium' };

export function CreateEventForm({ initialTier = 'free' }: { initialTier?: PackageTier }) {
  const router = useRouter();
  const [visibility, setVisibility] = useState<'public' | 'pin_protected'>('public');
  const [tier, setTier] = useState<PackageTier>(initialTier);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    setFormError(null);

    const fd = new FormData(e.currentTarget);
    const raw = {
      title: String(fd.get('title') ?? ''),
      eventDate: String(fd.get('eventDate') ?? ''),
      eventType: String(fd.get('eventType') ?? '') as EventType,
      packageTier: tier,
      visibility,
      pin: visibility === 'pin_protected' ? String(fd.get('pin') ?? '') : undefined,
    };

    const parsed = createEventSchema.safeParse(raw);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        fieldErrors[issue.path.join('.') || 'form'] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    try {
      const event = await organizerApi<EventWithStatsDto>('/events', {
        method: 'POST',
        body: JSON.stringify({ ...parsed.data, eventDate: parsed.data.eventDate.toISOString() }),
      });
      router.push(`/dashboard/events/${event.id}`);
      router.refresh();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Greška pri čuvanju.');
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-5">
      <div>
        <label className="label" htmlFor="title">
          Ime / imena (npr. „Ana i Marko")
        </label>
        <input id="title" name="title" className="input" required />
        {errors.title && <p className="field-error">{errors.title}</p>}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="eventDate">
            Datum
          </label>
          <input id="eventDate" name="eventDate" type="date" className="input" required />
          {errors.eventDate && <p className="field-error">{errors.eventDate}</p>}
        </div>
        <div>
          <label className="label" htmlFor="eventType">
            Tip događaja
          </label>
          <select id="eventType" name="eventType" className="input" defaultValue="wedding">
            {EVENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {eventTypeLabel(t)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <fieldset>
        <legend className="label">Paket</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {PACKAGE_TIERS.map((t) => (
            <label
              key={t}
              className={`flex cursor-pointer flex-col rounded-xl border p-4 text-sm ${
                tier === t ? 'border-primary-500 bg-primary-50' : 'border-surface-300'
              }`}
            >
              <span className="flex items-center gap-2">
                <input
                  type="radio"
                  name="packageTier"
                  value={t}
                  checked={tier === t}
                  onChange={() => setTier(t)}
                />
                <span className="font-medium">{TIER_LABELS[t]}</span>
              </span>
              <span className="mt-1 text-surface-500">
                Čuvanje {RETENTION_DAYS[t]} dana
              </span>
            </label>
          ))}
        </div>
        <p className="mt-2 text-xs text-surface-500">
          Naplata još nije aktivna — paket sad utiče samo na period čuvanja.
        </p>
      </fieldset>

      <fieldset>
        <legend className="label">Pristup galeriji</legend>
        <div className="space-y-2 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="visibility"
              value="public"
              checked={visibility === 'public'}
              onChange={() => setVisibility('public')}
            />
            Javna — svako sa linkom vidi galeriju
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="visibility"
              value="pin_protected"
              checked={visibility === 'pin_protected'}
              onChange={() => setVisibility('pin_protected')}
            />
            PIN zaštićena — za pregled galerije treba PIN
          </label>
        </div>
        {visibility === 'pin_protected' && (
          <div className="mt-3">
            <label className="label" htmlFor="pin">
              PIN (4–8 cifara)
            </label>
            <input
              id="pin"
              name="pin"
              inputMode="numeric"
              pattern="\d{4,8}"
              className="input max-w-[12rem]"
              placeholder="npr. 4821"
            />
            {errors.pin && <p className="field-error">{errors.pin}</p>}
            <p className="mt-1 text-xs text-surface-500">
              Gosti i dalje šalju fotografije bez PIN-a — PIN je samo za pregled galerije.
            </p>
          </div>
        )}
      </fieldset>

      {formError && <p className="text-sm text-primary-700">{formError}</p>}

      <div className="flex gap-3">
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? 'Čuvam…' : 'Napravi događaj'}
        </button>
      </div>
    </form>
  );
}
