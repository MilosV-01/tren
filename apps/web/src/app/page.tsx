import type { Metadata } from 'next';
import { SiteHeader } from '@/components/site/site-header';
import { SiteFooter } from '@/components/site/site-footer';
import { LandingJsonLd } from '@/components/site/json-ld';
import {
  Audience,
  Faq,
  Features,
  FinalCta,
  Hero,
  HowItWorks,
  Partners,
  Pricing,
  Stats,
} from '@/components/site/landing-sections';

export const metadata: Metadata = {
  title: 'Tren — zajednička galerija fotografija sa vašeg događaja',
  description:
    'Gosti skeniraju QR kod, upišu ime i šalju fotografije i video direktno u zajedničku galeriju. Bez aplikacije, bez naloga. Besplatno za male događaje.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Tren — sve fotografije sa vašeg događaja na jednom mestu',
    description:
      'QR kod na stolu → gost šalje fotografije → sve u zajedničkoj galeriji. Bez instalacije aplikacije.',
    url: '/',
    type: 'website',
    images: [{ url: '/og.png', width: 1200, height: 630 }],
  },
};

export default function LandingPage() {
  return (
    <>
      <LandingJsonLd />
      <SiteHeader />
      <main>
        <Hero />
        <Stats />
        <HowItWorks />
        <Features />
        <Audience />
        <Pricing />
        <Partners />
        <Faq />
        <FinalCta />
      </main>
      <SiteFooter />
    </>
  );
}
