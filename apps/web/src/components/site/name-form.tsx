'use client';

import { useState } from 'react';
import { joinEventSchema, type GuestSessionDto } from '@tren/shared';
import { publicApi } from '@/lib/browser-api';
import { ApiError } from '@/lib/api-error';
import { saveGuestSession } from '@/lib/guest-session';

/** Asks a guest for their name and opens a session for them on this event.
 *  Shared by the camera (before shooting) and the gallery (before it can
 *  show "your" photos). */
export function NameForm({
  slug,
  onJoined,
  heading = 'Kako se zoveš?',
  hint = 'Ime se pamti na ovom telefonu — ne moraš da ga unosiš ponovo.',
  submitLabel = 'Nastavi',
  busyLabel = 'Sačekaj…',
}: {
  slug: string;
  onJoined: (s: GuestSessionDto) => void;
  heading?: string;
  hint?: string;
  submitLabel?: string;
  busyLabel?: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const displayName = String(new FormData(e.currentTarget).get('displayName') ?? '').trim();

    const parsed = joinEventSchema.safeParse({ displayName });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }

    setBusy(true);
    try {
      const dto = await publicApi<GuestSessionDto>(`/public/events/${slug}/guests`, {
        method: 'POST',
        body: JSON.stringify(parsed.data),
      });
      saveGuestSession(slug, dto);
      onJoined(dto);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Greška. Pokušaj ponovo.');
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-4">
      <div>
        <label className="label font-serif text-base text-primary-900" htmlFor="displayName">
          {heading}
        </label>
        <input
          id="displayName"
          name="displayName"
          className="input mt-2"
          placeholder="npr. Jelena"
          autoComplete="name"
          required
        />
        <p className="mt-2 text-xs text-surface-500">{hint}</p>
      </div>
      {error && <p className="field-error">{error}</p>}
      <button type="submit" className="btn-primary w-full" disabled={busy}>
        {busy ? busyLabel : submitLabel}
      </button>
    </form>
  );
}
