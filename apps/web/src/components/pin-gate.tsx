'use client';

import { useState } from 'react';
import { verifyPinSchema, type VerifyPinResultDto } from '@tren/shared';
import { publicApi } from '@/lib/browser-api';
import { ApiError } from '@/lib/api-error';
import { saveGalleryAccess } from '@/lib/guest-session';

export function PinGate({ slug, onUnlocked }: { slug: string; onUnlocked: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const pin = String(new FormData(e.currentTarget).get('pin') ?? '').trim();

    const parsed = verifyPinSchema.safeParse({ pin });
    if (!parsed.success) {
      setError('PIN ima 4 do 8 cifara.');
      return;
    }

    setBusy(true);
    try {
      const res = await publicApi<VerifyPinResultDto>(`/public/events/${slug}/verify-pin`, {
        method: 'POST',
        body: JSON.stringify(parsed.data),
      });
      saveGalleryAccess(slug, res.accessToken, res.expiresIn);
      onUnlocked();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Pogrešan PIN.');
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card mx-auto max-w-sm space-y-4 text-center">
      <div className="text-3xl">🔒</div>
      <div>
        <h2 className="font-semibold text-surface-900">Galerija je zaključana</h2>
        <p className="mt-1 text-sm text-surface-600">Unesi PIN koji si dobio/la od organizatora.</p>
      </div>
      <input
        name="pin"
        inputMode="numeric"
        pattern="\d{4,8}"
        className="input text-center text-lg tracking-[0.4em]"
        placeholder="••••"
        autoFocus
        required
      />
      {error && <p className="text-sm text-primary-700">{error}</p>}
      <button type="submit" className="btn-primary w-full" disabled={busy}>
        {busy ? 'Proveravam…' : 'Otključaj'}
      </button>
    </form>
  );
}
