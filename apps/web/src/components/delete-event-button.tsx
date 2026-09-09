'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { organizerApi } from '@/lib/browser-api';

export function DeleteEventButton({ eventId, title }: { eventId: string; title: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onDelete() {
    if (!confirm(`Obrisati događaj „${title}"? Sve fotografije i video se trajno uklanjaju.`)) {
      return;
    }
    setBusy(true);
    try {
      await organizerApi(`/events/${eventId}`, { method: 'DELETE' });
      router.push('/dashboard');
      router.refresh();
    } catch {
      setBusy(false);
      alert('Brisanje nije uspelo.');
    }
  }

  return (
    <button className="btn-ghost text-sm text-primary-700" onClick={onDelete} disabled={busy}>
      {busy ? 'Brišem…' : 'Obriši događaj'}
    </button>
  );
}
