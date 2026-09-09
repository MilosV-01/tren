import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import type { AuthUserDto } from '@tren/shared';
import { serverApi } from '@/lib/server-api';
import { ApiError } from '@/lib/api-error';
import { LogoutButton } from '@/components/logout-button';
import { Logo } from '@/components/site/logo';

export const metadata: Metadata = {
  title: 'Dashboard',
  robots: { index: false, follow: false },
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  let user: AuthUserDto;
  try {
    user = await serverApi<AuthUserDto>('/auth/me');
  } catch (err) {
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
      redirect('/login?next=/dashboard');
    }
    throw err;
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-surface-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/dashboard" aria-label="Tren — dashboard">
            <Logo markClass="h-6 w-6" />
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
