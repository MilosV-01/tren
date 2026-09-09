import type { Metadata } from 'next';
import { AuthForm } from '@/components/auth-form';

export const metadata: Metadata = {
  title: 'Prijava',
  robots: { index: false, follow: false },
};

export default function LoginPage({ searchParams }: { searchParams: { next?: string } }) {
  return <AuthForm mode="login" next={searchParams.next ?? '/dashboard'} />;
}
