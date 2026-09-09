import Link from 'next/link';
import { BRAND } from '@/lib/config';
import { Logo } from './logo';

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-surface-200 bg-white">
      <div className="mx-auto max-w-6xl px-5 py-12">
        <div className="flex flex-col gap-8 sm:flex-row sm:justify-between">
          <div className="max-w-sm">
            <Logo markClass="h-7 w-7" />
            <p className="mt-3 text-sm text-surface-600">{BRAND.tagline}.</p>
          </div>

          <div className="grid grid-cols-2 gap-8 text-sm">
            <div>
              <p className="font-medium text-surface-900">Proizvod</p>
              <ul className="mt-3 space-y-2 text-surface-600">
                <li>
                  <a href="/#kako-radi" className="hover:text-surface-900">
                    Kako radi
                  </a>
                </li>
                <li>
                  <a href="/#cene" className="hover:text-surface-900">
                    Cene
                  </a>
                </li>
                <li>
                  <a href="/#faq" className="hover:text-surface-900">
                    Česta pitanja
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <p className="font-medium text-surface-900">Nalog</p>
              <ul className="mt-3 space-y-2 text-surface-600">
                <li>
                  <Link href="/register" className="hover:text-surface-900">
                    Registracija
                  </Link>
                </li>
                <li>
                  <Link href="/login" className="hover:text-surface-900">
                    Prijava
                  </Link>
                </li>
                <li>
                  <a href={`mailto:${BRAND.email}`} className="hover:text-surface-900">
                    Kontakt
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-surface-100 pt-6 text-xs text-surface-400 sm:flex-row sm:justify-between">
          <p>
            © {year} {BRAND.name}. Sva prava zadržana.
          </p>
          <p>Napravljeno za događaje koji se pamte.</p>
        </div>
      </div>
    </footer>
  );
}
