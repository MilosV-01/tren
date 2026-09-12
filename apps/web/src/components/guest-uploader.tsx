'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { type GuestSessionDto, type UploadTicketDto } from '@tren/shared';
import { publicApi } from '@/lib/browser-api';
import { ApiError } from '@/lib/api-error';
import {
  getGuestSession,
  clearGuestSession,
  getRollCount,
  addRollCount,
} from '@/lib/guest-session';
import { putWithProgress, resolveContentType } from '@/lib/xhr-upload';
import { FilmFrame } from '@/components/site/film-frame';
import { FlipCounter } from '@/components/site/flip-counter';
import { ShutterButton } from '@/components/site/shutter-button';
import { NameForm } from '@/components/site/name-form';

/** Size of the fun "film roll" — purely cosmetic, never actually blocks sending. */
const ROLL_SIZE = 36;

/** Serbian noun agreement for "fotografija" (1 → fotografija, 2–4 → fotografije, 5+/0 → fotografija). */
function photoWord(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'fotografija';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'fotografije';
  return 'fotografija';
}

type ItemStatus = 'pending' | 'uploading' | 'done' | 'error';
interface UploadItem {
  id: string;
  file: File;
  status: ItemStatus;
  progress: number;
  error?: string;
}

/** A small tileable noise texture, generated once and reused as a canvas
 *  pattern for the grain pass below — cheap grain without a per-pixel loop
 *  on every photo. */
let grainPatternCache: CanvasPattern | null | undefined;
function grainPattern(ctx: CanvasRenderingContext2D): CanvasPattern | null {
  if (grainPatternCache !== undefined) return grainPatternCache;
  try {
    const size = 64;
    const tile = document.createElement('canvas');
    tile.width = size;
    tile.height = size;
    const tctx = tile.getContext('2d');
    if (!tctx) return (grainPatternCache = null);
    const img = tctx.createImageData(size, size);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.floor(Math.random() * 255);
      img.data[i] = v;
      img.data[i + 1] = v;
      img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    tctx.putImageData(img, 0, 0);
    return (grainPatternCache = ctx.createPattern(tile, 'repeat'));
  } catch {
    return (grainPatternCache = null);
  }
}

/**
 * Bakes a retro, Retrica-style grade into a photo before it's sent: warm and
 * punchy with faded-plastic-lens vignetting and a touch of film grain — every
 * shot on the roll ends up looking like it belongs together. Purely cosmetic:
 * any failure (unsupported browser, odd file) falls back to the original file
 * so a filter glitch can never block sending.
 */
async function applyRetroFilter(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement('canvas');
    const w = (canvas.width = bitmap.width);
    const h = (canvas.height = bitmap.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;

    // Warm, punchy base grade.
    ctx.filter = 'contrast(1.15) saturate(1.35) brightness(1.03) sepia(0.22) hue-rotate(-8deg)';
    ctx.drawImage(bitmap, 0, 0);
    ctx.filter = 'none';

    // Warm highlight tint.
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = 'rgba(255, 178, 102, 0.12)';
    ctx.fillRect(0, 0, w, h);

    // Toy-lens vignette — darker, slightly warm corners.
    ctx.globalCompositeOperation = 'source-over';
    const vignette = ctx.createRadialGradient(
      w / 2,
      h / 2,
      Math.min(w, h) * 0.35,
      w / 2,
      h / 2,
      Math.hypot(w, h) / 1.5,
    );
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(20,12,8,0.38)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);

    // Faint grain.
    const grain = grainPattern(ctx);
    if (grain) {
      ctx.globalAlpha = 0.05;
      ctx.globalCompositeOperation = 'overlay';
      ctx.fillStyle = grain;
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.9),
    );
    if (!blob) return file;
    const name = file.name.replace(/\.\w+$/, '.jpg') || `foto-${Date.now()}.jpg`;
    return new File([blob], name, { type: 'image/jpeg', lastModified: Date.now() });
  } catch {
    return file;
  }
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
    return <NameForm slug={slug} onJoined={setSession} submitLabel="Uđi u kameru" />;
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
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
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

  /** Runs the cinematic grade on each new photo, then sends it right away —
   *  no separate "send" step between the shutter and the guest's photo landing
   *  in the event's roll. */
  async function addFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const raw = Array.from(files);
    setPreview(raw[0]);

    setSending(true);
    let ok = 0;
    for (const original of raw) {
      const file = await applyRetroFilter(original);
      const item: UploadItem = {
        id: `${original.name}-${original.size}-${original.lastModified}-${Math.random().toString(36).slice(2)}`,
        file,
        status: 'pending',
        progress: 0,
      };
      setItems((prev) => [...prev, item]);
      if (await uploadOne(item)) ok += 1;
    }
    if (ok > 0) {
      setRollCount(addRollCount(slug, ok));
      setFlash(true);
      setTimeout(() => setFlash(false), 1700);
    }
    setSending(false);
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    if (galleryInputRef.current) galleryInputRef.current.value = '';
    setItems((prev) => prev.filter((it) => it.status !== 'done'));
  }

  /** Fallback for the rare failed upload — everything else sends automatically. */
  async function retryFailed() {
    setSending(true);
    let ok = 0;
    for (const item of items.filter((it) => it.status === 'error')) {
      if (await uploadOne(item)) ok += 1;
    }
    if (ok > 0) {
      setRollCount(addRollCount(slug, ok));
      setFlash(true);
      setTimeout(() => setFlash(false), 1700);
    }
    setSending(false);
    setItems((prev) => prev.filter((it) => it.status !== 'done'));
  }

  const remaining = Math.max(0, ROLL_SIZE - rollCount);
  const pending = items.filter((it) => it.status !== 'done').length;
  const failed = items.filter((it) => it.status === 'error').length;
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
              onClick={() => cameraInputRef.current?.click()}
            />
            <div className="flex items-center gap-2 text-xs text-surface-500">
              <span>preostalo</span>
              <FlipCounter value={remaining} />
              <span>{photoWord(remaining)}</span>
            </div>

            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              disabled={sending}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-primary-700
                transition hover:bg-primary-900/5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
                <rect x="2.5" y="3.5" width="15" height="13" rx="2" stroke="currentColor" strokeWidth="1.4" />
                <circle cx="6.5" cy="7.5" r="1.25" stroke="currentColor" strokeWidth="1.4" />
                <path d="M3 14l4.5-4 3 2.5 3-3.5 4.5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              dodaj iz galerije
            </button>

            {/* Direct camera capture — opens the phone's camera app immediately. */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => addFiles(e.target.files)}
            />
            {/* Gallery / library picker — secondary path, supports photos and videos. */}
            <input
              ref={galleryInputRef}
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

          {failed > 0 && (
            <button className="btn-primary w-full" onClick={retryFailed} disabled={sending}>
              {sending ? 'Šaljem…' : `Pokušaj ponovo (${failed})`}
            </button>
          )}
        </>
      )}

      <p className="text-center text-xs text-surface-400">{eventTitle}</p>
    </div>
  );
}
