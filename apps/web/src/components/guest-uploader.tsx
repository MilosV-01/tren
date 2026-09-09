'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  joinEventSchema,
  type GuestSessionDto,
  type UploadTicketDto,
} from '@tren/shared';
import { publicApi } from '@/lib/browser-api';
import { ApiError } from '@/lib/api-error';
import {
  getGuestSession,
  saveGuestSession,
  clearGuestSession,
} from '@/lib/guest-session';
import { putWithProgress, resolveContentType } from '@/lib/xhr-upload';

type ItemStatus = 'pending' | 'uploading' | 'done' | 'error';
interface UploadItem {
  id: string;
  file: File;
  status: ItemStatus;
  progress: number;
  error?: string;
}

export function GuestUploader({
  slug,
  eventTitle,
  isExpired,
}: {
  slug: string;
  eventTitle: string;
  isExpired: boolean;
}) {
  const [session, setSession] = useState<GuestSessionDto | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSession(getGuestSession(slug));
    setReady(true);
  }, [slug]);

  if (!ready) return null;

  if (isExpired) {
    return (
      <div className="card text-center">
        <p className="text-surface-700">
          Ovaj događaj više ne prima nove fotografije.
        </p>
      </div>
    );
  }

  if (!session) {
    return <NameForm slug={slug} onJoined={setSession} />;
  }

  return (
    <Uploader
      slug={slug}
      session={session}
      eventTitle={eventTitle}
      onChangeName={() => {
        clearGuestSession(slug);
        setSession(null);
      }}
    />
  );
}

function NameForm({
  slug,
  onJoined,
}: {
  slug: string;
  onJoined: (s: GuestSessionDto) => void;
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
        <label className="label" htmlFor="displayName">
          Kako se zoveš?
        </label>
        <input
          id="displayName"
          name="displayName"
          className="input"
          placeholder="npr. Jelena"
          autoComplete="name"
          required
        />
        <p className="mt-1 text-xs text-surface-500">
          Ime se pamti na ovom telefonu — ne moraš da ga unosiš ponovo.
        </p>
      </div>
      {error && <p className="text-sm text-primary-700">{error}</p>}
      <button type="submit" className="btn-primary w-full" disabled={busy}>
        {busy ? 'Sačekaj…' : 'Nastavi'}
      </button>
    </form>
  );
}

function Uploader({
  slug,
  session,
  eventTitle,
  onChangeName,
}: {
  slug: string;
  session: GuestSessionDto;
  eventTitle: string;
  onChangeName: () => void;
}) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [sending, setSending] = useState(false);
  const [sentCount, setSentCount] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    const next: UploadItem[] = Array.from(files).map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
      file,
      status: 'pending',
      progress: 0,
    }));
    setItems((prev) => [...prev, ...next]);
  }, []);

  function patch(id: string, changes: Partial<UploadItem>) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...changes } : it)));
  }

  async function uploadOne(item: UploadItem): Promise<boolean> {
    const contentType = resolveContentType(item.file);
    if (!contentType) {
      patch(item.id, { status: 'error', error: 'Nepodržan tip fajla' });
      return false;
    }

    patch(item.id, { status: 'uploading', progress: 0, error: undefined });
    try {
      const ticket = await publicApi<UploadTicketDto>(
        `/public/events/${slug}/media/upload-url`,
        {
          method: 'POST',
          guestSession: session.sessionToken,
          body: JSON.stringify({
            filename: item.file.name || `upload-${Date.now()}`,
            contentType,
            sizeBytes: item.file.size,
          }),
        },
      );

      await putWithProgress(ticket.uploadUrl, item.file, ticket.requiredHeaders, (f) =>
        patch(item.id, { progress: Math.round(f * 100) }),
      );

      await publicApi(`/public/events/${slug}/media/confirm`, {
        method: 'POST',
        guestSession: session.sessionToken,
        body: JSON.stringify({ mediaId: ticket.mediaId }),
      });

      patch(item.id, { status: 'done', progress: 100 });
      return true;
    } catch (err) {
      patch(item.id, {
        status: 'error',
        error: err instanceof ApiError ? err.message : 'Slanje nije uspelo',
      });
      return false;
    }
  }

  async function sendAll() {
    setSending(true);
    let ok = 0;
    // Sequential — keeps mobile connections stable and progress readable.
    for (const item of items) {
      if (item.status === 'done') continue;
      const success = await uploadOne(item);
      if (success) ok += 1;
    }
    setSentCount((c) => c + ok);
    setSending(false);
    if (inputRef.current) inputRef.current.value = '';
    // Drop the successfully-sent ones so the list shows only what's left.
    setItems((prev) => prev.filter((it) => it.status !== 'done'));
  }

  const pending = items.filter((it) => it.status !== 'done').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm">
        <span className="text-surface-600">
          Šalješ kao <strong className="text-surface-900">{session.displayName}</strong>
        </span>
        <button className="text-primary-700 hover:underline" onClick={onChangeName}>
          Promeni ime
        </button>
      </div>

      <label className="card flex cursor-pointer flex-col items-center gap-2 border-dashed py-10 text-center">
        <span className="text-3xl">📷</span>
        <span className="font-medium text-surface-800">Dodaj fotografije ili video</span>
        <span className="text-xs text-surface-500">Iz galerije ili snimi odmah</span>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
      </label>

      {items.length > 0 && (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id} className="card flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-surface-800">{item.file.name}</p>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface-100">
                  <div
                    className={`h-full rounded-full ${
                      item.status === 'error' ? 'bg-primary-300' : 'bg-primary-600'
                    }`}
                    style={{ width: `${item.status === 'pending' ? 0 : item.progress}%` }}
                  />
                </div>
                {item.error && <p className="mt-1 text-xs text-primary-700">{item.error}</p>}
              </div>
              <span className="shrink-0 text-xs text-surface-500">
                {item.status === 'done'
                  ? '✓'
                  : item.status === 'uploading'
                    ? `${item.progress}%`
                    : item.status === 'error'
                      ? 'greška'
                      : 'spremno'}
              </span>
            </li>
          ))}
        </ul>
      )}

      {pending > 0 && (
        <button className="btn-primary w-full" onClick={sendAll} disabled={sending}>
          {sending ? 'Šaljem…' : `Pošalji (${pending})`}
        </button>
      )}

      {sentCount > 0 && (
        <div className="card bg-primary-50 text-center text-sm">
          <p className="text-surface-800">Hvala! Poslato: {sentCount}.</p>
          <Link href={`/e/${slug}/gallery`} className="mt-2 inline-block font-medium text-primary-700">
            Pogledaj galeriju →
          </Link>
        </div>
      )}

      <p className="text-center text-xs text-surface-400">{eventTitle}</p>
    </div>
  );
}
