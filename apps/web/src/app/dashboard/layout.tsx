import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import type { AuthUserDto } from '@tren/shared';
import { serverApi } from '@/lib/server-api';
import { ApiError } from '@/lib/api-error';
import { LogoutButton } from '@/components/logout-button';
import { Wordmark } from '@/components/site/logo';

export const metadata: Metadata = {
  title: 'Dashboard',
  robots: { index: false, follow: false },
};

// Give the API's free-tier cold start (it sleeps after 15 min idle) room to
// wake up within a single request instead of the platform cutting it short.
export const maxDuration = 60;

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  let user: AuthUserDto;
  try {
    user = await serverApi<AuthUserDto>('/auth/me');
  } catch (err) {
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
      redirect('/login?next=/dashboard');
    }
    // Anything else (network hiccup, API still waking up from sleep, etc.) —
    // show a friendly retry instead of crashing the whole dashboard, navbar
    // included, into the generic error page.
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <Wordmark className="text-xl" />
        <p className="max-w-sm text-sm text-surface-600">
          Trenutno ne možemo da se povežemo sa serverom. Ako se ovo desilo posle duže pauze, server se
          verovatno budi — probaj ponovo za par sekundi.
        </p>
        <a href="/dashboard" className="btn-primary text-sm">
          Pokušaj ponovo
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-surface-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/dashboard" aria-label="Tren — dashboard">
            <Wordmark className="text-xl" />
          </Link>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-surface-500 sm:inline">{user.organizationName}</span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
