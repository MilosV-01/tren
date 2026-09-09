import type { Metadata } from 'next';
import { AuthForm } from '@/components/auth-form';

export const metadata: Metadata = {
  title: 'Napravi nalog',
  robots: { index: false, follow: false },
};

const PLAN_NOTE: Record<string, string> = {
  premium: 'Izabran je Premium paket — primenićeš ga pri kreiranju prvog događaja.',
  partner:
    'Zainteresovan/a si za Partner (white-label). Napravi nalog, pa te kontaktiramo oko podešavanja brenda.',
};

export default function RegisterPage({
  searchParams,
}: {
  searchParams: { next?: string; plan?: string };
}) {
  const planNote = searchParams.plan ? PLAN_NOTE[searchParams.plan] : undefined;
  const next =
    searchParams.next ?? (searchParams.plan === 'premium' ? '/dashboard/events/new?plan=premium' : '/dashboard');

  return (
    <AuthForm
      mode="register"
      next={next}
      note={planNote}
      defaultOrgType={searchParams.plan === 'partner' ? 'venue' : 'individual'}
    />
  );
}
