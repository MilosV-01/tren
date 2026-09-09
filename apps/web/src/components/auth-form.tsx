'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ORGANIZATION_TYPES, type OrganizationType } from '@tren/shared';
import { Logo } from '@/components/site/logo';

type Mode = 'login' | 'register';

const ORG_TYPE_LABELS: Record<OrganizationType, string> = {
  individual: 'Pojedinac (par / slavljenik)',
  venue: 'Sala',
  photographer: 'Fotograf',
  planner: 'Wedding planer',
};

export function AuthForm({
  mode,
  next,
  note,
  defaultOrgType = 'individual',
}: {
  mode: Mode;
  next: string;
  note?: string;
  defaultOrgType?: OrganizationType;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const payload =
      mode === 'register'
        ? {
            organizationName: form.get('organizationName'),
            organizationType: form.get('organizationType'),
            email: form.get('email'),
            password: form.get('password'),
          }
        : { email: form.get('email'), password: form.get('password') };

    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(readError(body));
        return;
      }
      router.push(next || '/dashboard');
      router.refresh();
    } catch {
      setError('Nije moguće povezati se sa serverom.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <Link href="/" className="mb-8" aria-label="Tren — početna">
        <Logo markClass="h-7 w-7" />
      </Link>
      <h1 className="text-2xl font-semibold text-surface-900">
        {mode === 'register' ? 'Napravi nalog' : 'Prijava za organizatore'}
      </h1>
      <p className="mt-1 text-sm text-surface-600">
        {mode === 'register'
          ? 'Nalog ti treba samo za upravljanje događajima. Gosti nikad ne prave nalog.'
          : 'Unesi email i lozinku.'}
      </p>

      {note && (
        <p className="mt-4 rounded-lg border border-primary-200 bg-primary-50 px-3 py-2 text-sm text-primary-800">
          {note}
        </p>
      )}

      <form onSubmit={onSubmit} className="card mt-6 space-y-4">
        {mode === 'register' && (
          <>
            <div>
              <label className="label" htmlFor="organizationName">
                Naziv (tvoj ili firme)
              </label>
              <input id="organizationName" name="organizationName" className="input" required />
            </div>
            <div>
              <label className="label" htmlFor="organizationType">
                Tip naloga
              </label>
              <select
                id="organizationType"
                name="organizationType"
                className="input"
                defaultValue={defaultOrgType}
              >
                {ORGANIZATION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {ORG_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}
        <div>
          <label className="label" htmlFor="email">
            Email
          </label>
          <input id="email" name="email" type="email" autoComplete="email" className="input" required />
        </div>
        <div>
          <label className="label" htmlFor="password">
            Lozinka
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            minLength={mode === 'register' ? 8 : undefined}
            className="input"
            required
          />
          {mode === 'register' && (
            <p className="mt-1 text-xs text-surface-500">Najmanje 8 karaktera.</p>
          )}
        </div>

        {error && <p className="text-sm text-primary-700">{error}</p>}

        <button type="submit" className="btn-primary w-full" disabled={submitting}>
          {submitting ? 'Sačekaj…' : mode === 'register' ? 'Napravi nalog' : 'Prijavi se'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-surface-600">
        {mode === 'register' ? (
          <>
            Već imaš nalog?{' '}
            <Link href="/login" className="font-medium text-primary-700">
              Prijava
            </Link>
          </>
        ) : (
          <>
            Nemaš nalog?{' '}
            <Link href="/register" className="font-medium text-primary-700">
              Registracija
            </Link>
          </>
        )}
      </p>
    </main>
  );
}

function readError(body: unknown): string {
  if (body && typeof body === 'object' && 'message' in body) {
    const m = (body as { message: unknown }).message;
    if (typeof m === 'string') return m;
    if (Array.isArray(m)) return String(m[0]);
  }
  return 'Nešto nije u redu. Pokušaj ponovo.';
}
