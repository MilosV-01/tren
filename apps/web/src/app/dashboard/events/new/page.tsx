import Link from 'next/link';
import type { Metadata } from 'next';
import { CreateEventForm } from '@/components/create-event-form';
import type { PackageTier } from '@tren/shared';

export const metadata: Metadata = {
  title: 'Novi događaj',
  robots: { index: false, follow: false },
};

export default function NewEventPage({ searchParams }: { searchParams: { plan?: string } }) {
  const initialTier: PackageTier = searchParams.plan === 'premium' ? 'premium' : 'free';

  return (
    <div className="max-w-2xl">
      <Link href="/dashboard" className="text-sm text-surface-500 hover:text-surface-800">
        ← Nazad na događaje
      </Link>
      <h1 className="mt-3 text-2xl font-semibold text-surface-900">Novi događaj</h1>
      <p className="mb-6 mt-1 text-sm text-surface-600">
        Posle kreiranja dobijaš QR kod i link za goste.
      </p>
      <CreateEventForm initialTier={initialTier} />
    </div>
  );
}
