import Link from 'next/link';
import { LogoMark } from '@/components/site/logo';

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
      <LogoMark className="h-12 w-12 text-surface-900" />
      <h1 className="mt-6 text-2xl font-semibold text-surface-900">Stranica nije pronađena</h1>
      <p className="mt-2 text-surface-600">
        Link je možda istekao ili je pogrešno unet. Proveri QR kod ili se javi organizatoru događaja.
      </p>
      <Link href="/" className="btn-primary mt-6">
        Nazad na početnu
      </Link>
    </main>
  );
}
