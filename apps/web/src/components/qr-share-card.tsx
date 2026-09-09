'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';

/**
 * The share link is built from `window.location.origin` — i.e. whatever host the
 * organizer is currently using (localhost, LAN IP, real domain). That way the QR
 * a phone scans always points at a host that phone can actually reach.
 * `fallbackUrl` (server-rendered) is only used for the first paint / no-JS.
 */
export function QrShareCard({ slug, fallbackUrl }: { slug: string; fallbackUrl: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [origin, setOrigin] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const shareUrl = useMemo(
    () => (origin ? `${origin}/e/${slug}` : fallbackUrl),
    [origin, slug, fallbackUrl],
  );

  useEffect(() => {
    if (canvasRef.current) {
      void QRCode.toCanvas(canvasRef.current, shareUrl, {
        width: 240,
        margin: 2,
        color: { dark: '#1c1917', light: '#ffffff' },
      });
    }
  }, [shareUrl]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — the text is on screen to copy manually */
    }
  }

  async function downloadPng() {
    const dataUrl = await QRCode.toDataURL(shareUrl, { width: 1024, margin: 3 });
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `tren-qr-${slug}.png`;
    a.click();
  }

  async function printQr() {
    const dataUrl = await QRCode.toDataURL(shareUrl, { width: 900, margin: 2 });
    const w = window.open('', '_blank', 'width=800,height=900');
    if (!w) return;
    w.document.write(`
      <html><head><title>Tren — QR za sto</title>
      <style>
        *{font-family:system-ui,sans-serif} body{margin:0;display:flex;min-height:100vh;
        align-items:center;justify-content:center} .card{text-align:center;padding:48px}
        img{width:320px;height:320px} h1{font-size:22px;margin:24px 0 4px} p{color:#555;margin:0}
        @media print{@page{margin:12mm}}
      </style></head>
      <body><div class="card">
        <img src="${dataUrl}" alt="QR" />
        <h1>Podeli fotografije sa nama</h1>
        <p>Skeniraj kod telefonom — bez instalacije aplikacije</p>
        <p style="margin-top:12px;font-size:13px;color:#999">${shareUrl}</p>
      </div>
      <script>window.onload=function(){window.print()}</script>
      </body></html>`);
    w.document.close();
  }

  return (
    <div className="card">
      <h2 className="text-base font-semibold text-surface-900">QR kod i link za goste</h2>
      <p className="mt-1 text-sm text-surface-600">
        Odštampaj QR i stavi ga na stolove, ili podeli link direktno.
      </p>

      <div className="mt-5 flex flex-col items-center gap-5 sm:flex-row sm:items-start">
        <canvas
          ref={canvasRef}
          className="shrink-0 rounded-xl border border-surface-200 bg-white p-1"
        />
        <div className="w-full space-y-3">
          <div className="rounded-lg bg-surface-100 px-3 py-2">
            <span className="text-[11px] font-medium uppercase tracking-wide text-surface-400">
              Link za goste
            </span>
            <code className="mt-0.5 block break-all text-xs text-surface-700">{shareUrl}</code>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn-secondary text-sm" onClick={copy}>
              {copied ? 'Kopirano ✓' : 'Kopiraj link'}
            </button>
            <button className="btn-secondary text-sm" onClick={downloadPng}>
              Preuzmi PNG
            </button>
            <button className="btn-secondary text-sm" onClick={printQr}>
              Štampaj
            </button>
          </div>
          <p className="text-xs text-surface-400">
            QR i link vode na host sa kog si trenutno otvorio/la dashboard. Za skeniranje
            sa tuđih telefona koristi javni domen ili IP sa iste Wi-Fi mreže.
          </p>
        </div>
      </div>
    </div>
  );
}
