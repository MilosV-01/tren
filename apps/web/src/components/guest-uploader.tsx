'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { joinEventSchema, type GuestSessionDto, type UploadTicketDto } from '@tren/shared';
import { publicApi } from '@/lib/browser-api';
import { ApiError } from '@/lib/api-error';
import {
  getGuestSession,
  saveGuestSession,
  clearGuestSession,
  getRollCount,
  addRollCount,
} from '@/lib/guest-session';
import { putWithProgress, resolveContentType } from '@/lib/xhr-upload';
import { FilmFrame } from '@/components/site/film-frame';
import { FlipCounter } from '@/components/site/flip-counter';
import { ShutterButton } from '@/components/site/shutter-button';

/** Size of the fun "film roll" — purely cosmetic, never actually blocks sending. */
const ROLL_SIZE = 36;

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
      <FilmFrame
        placeholder={
          <p className="font-sans text-sm text-surface-50/80">
            Ovaj događaj više ne prima nove fotografije.
          </p>
        }
      />
    );
  }

  if (!session) {
    return <NameForm slug={slug} onJoined={setSession} />;
  }

  return (
    <Camera
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
        <label className="label font-serif text-base text-primary-900" htmlFor="displayName">
          Kako se zoveš?
        </label>
        <input
          id="displayName"
          name="displayName"
          className="input mt-2"
          placeholder="npr. Jelena"
          autoComplete="name"
          required
        />
        <p className="mt-2 text-xs text-surface-500">
          Ime se pamti na ovom telefonu — ne moraš da ga unosiš ponovo.
        </p>
      </div>
      {error && <p className="field-error">{error}</p>}
      <button type="submit" className="btn-primary w-full" disabled={busy}>
        {busy ? 'Sačekaj…' : 'Uđi u kameru'}
      </button>
    </form>
  );
}

function Camera({
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
  const [rollCount, setRollCount] = useState(0);
  const [continued, setContinued] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<string | null>(null);

  useEffect(() => {
    setRollCount(getRollCount(slug));
  }, [slug]);

  useEffect(
    () => () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    },
    [],
  );

  const setPreview = useCallback((file: File | null) => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    const url = file ? URL.createObjectURL(file) : null;
    previewRef.current = url;
    setPreviewUrl(url);
  }, []);

  const addFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const list = Array.from(files);
      const next: UploadItem[] = list.map((file) => ({
        id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
        file,
        status: 'pending',
        progress: 0,
      }));
      setItems((prev) => [...prev, ...next]);
      setPreview(list[0]);
    },
    [setPreview],
  );

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
    for (const item of items) {
      if (item.status === 'done') continue;
      if (await uploadOne(item)) ok += 1;
    }
    if (ok > 0) {
      setRollCount(addRollCount(slug, ok));
      setFlash(true);
      setTimeout(() => setFlash(false), 1700);
    }
    setSending(false);
    if (inputRef.current) inputRef.current.value = '';
    setItems((prev) => prev.filter((it) => it.status !== 'done'));
  }

  const remaining = Math.max(0, ROLL_SIZE - rollCount);
  const pending = items.filter((it) => it.status !== 'done').length;
  const finished = remaining === 0 && !continued && pending === 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-surface-600">
          Šalješ kao <strong className="font-serif text-primary-900">{session.displayName}</strong>
        </span>
        <button className="text-primary-700 underline-offset-2 hover:underline" onClick={onChangeName}>
          Promeni ime
        </button>
      </div>

      <FilmFrame
        src={previewUrl ?? undefined}
        alt="Poslednja fotografija"
        overlay={
          flash ? (
            <p className="font-sans text-lg leading-relaxed text-surface-50">
              Fotografija je sačuvana.
              <br />
              Nastavi da hvataš trenutke.
            </p>
          ) : undefined
        }
        placeholder={
          <p className="font-serif text-base italic text-surface-50/80">
            Spreman/na za prvi kadar
          </p>
        }
      />

      {finished ? (
        <div className="space-y-4 text-center">
          <p className="font-serif text-xl text-primary-900">Film je završen.</p>
          <p className="text-sm text-surface-600">Poslao/la si svih {ROLL_SIZE} fotografija — bravo!</p>
          <div className="flex flex-col items-center gap-2">
            <Link href={`/e/${slug}/gallery`} className="btn-pill">
              Pogledaj film
            </Link>
            <button
              className="text-xs text-surface-500 underline-offset-2 hover:underline"
              onClick={() => setContinued(true)}
            >
              Nastavi da šalješ ipak
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-col items-center gap-3">
            <ShutterButton
              busy={sending}
              disabled={sending}
              onClick={() => inputRef.current?.click()}
            />
            <div className="flex items-center gap-2 text-xs text-surface-500">
              <span>preostalo</span>
              <FlipCounter value={remaining} />
              <span>slika</span>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={(e) => addFiles(e.target.files)}
            />
          </div>

          {items.length > 0 && (
            <ul className="space-y-2">
              {items.map((item) => (
                <li key={item.id} className="card flex items-center gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-surface-800">{item.file.name}</p>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface-100">
                      <div
                        className={`h-full rounded-full ${
                          item.status === 'error' ? 'bg-danger-600' : 'bg-primary-800'
                        }`}
                        style={{ width: `${item.status === 'pending' ? 0 : item.progress}%` }}
                      />
                    </div>
                    {item.error && <p className="field-error">{item.error}</p>}
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
        </>
      )}

      <p className="text-center text-xs text-surface-400">{eventTitle}</p>
    </div>
  );
}
