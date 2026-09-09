import type { Metadata, Viewport } from 'next';
import { SITE_URL, BRAND } from '@/lib/config';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Tren — zajednička galerija fotografija sa vašeg događaja',
    template: '%s · Tren',
  },
  description:
    'Gosti skeniraju QR kod, upišu ime i šalju fotografije i video direktno u zajedničku galeriju. Bez aplikacije, bez naloga.',
  applicationName: BRAND.name,
  authors: [{ name: BRAND.name }],
  keywords: [
    'galerija sa venčanja',
    'QR kod za fotografije',
    'deljenje fotografija sa događaja',
    'svadbena galerija',
    'wedding photo sharing',
    'fotografije gostiju',
    'Tren',
  ],
  alternates: { canonical: '/' },
  // Favicon + apple-touch-icon come from the app-dir file conventions
  // (app/icon.svg, app/apple-icon.png).
  openGraph: {
    type: 'website',
    locale: 'sr_RS',
    url: SITE_URL,
    siteName: BRAND.name,
    title: 'Tren — sve fotografije sa vašeg događaja na jednom mestu',
    description:
      'QR kod na stolu → gost šalje fotografije → sve u zajedničkoj galeriji. Bez instalacije aplikacije.',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: BRAND.tagline }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tren — zajednička galerija sa vašeg događaja',
    description: 'Gosti skeniraju QR kod i šalju fotografije u zajedničku galeriju. Bez aplikacije.',
    images: ['/og.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  category: 'technology',
};

export const viewport: Viewport = {
  themeColor: '#e11d48',
  width: 'device-width',
  initialScale: 1,
  colorScheme: 'light',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sr">
      <body className="min-h-screen bg-surface-50">{children}</body>
    </html>
  );
}
