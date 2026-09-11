'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Wordmark } from './logo';

const NAV = [
  { href: '/#kako-radi', label: 'Kako radi' },
  { href: '/#mogucnosti', label: 'Mogućnosti' },
  { href: '/#cene', label: 'Cene' },
  { href: '/#partneri', label: 'Za partnere' },
  { href: '/#faq', label: 'Pitanja' },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-surface-200/70 bg-surface-50/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
        <Link href="/" aria-label="Tren — početna">
          <Wordmark className="text-2xl" />
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {NAV.map((n) => (
            <a key={n.href} href={n.href} className="text-sm text-surface-600 hover:text-surface-900">
              {n.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Link href="/login" className="btn-ghost text-sm">
            Prijava
          </Link>
          <Link href="/register" className="btn-primary text-sm">
            Napravi događaj
          </Link>
        </div>

        <button
          className="btn-ghost md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Meni"
          aria-expanded={open}
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>

      {open && (
        <div className="border-t border-surface-200 bg-surface-50 md:hidden">
          <div className="mx-auto max-w-6xl space-y-1 px-5 py-3">
            {NAV.map((n) => (
              <a
                key={n.href}
                href={n.href}
                onClick={() => setOpen(false)}
                className="block rounded-lg px-3 py-2 text-sm text-surface-700 hover:bg-surface-100"
              >
                {n.label}
              </a>
            ))}
            <div className="flex gap-2 pt-2">
              <Link href="/login" className="btn-secondary flex-1 text-sm">
                Prijava
              </Link>
              <Link href="/register" className="btn-primary flex-1 text-sm">
                Napravi događaj
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
