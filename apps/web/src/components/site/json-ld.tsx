import { SITE_URL, BRAND } from '@/lib/config';
import { FAQ, PRICING } from '@/lib/marketing';

/**
 * Structured data for the landing page: Organization, the product with its
 * offers, and the FAQ. Rendered as a single JSON-LD script.
 */
export function LandingJsonLd() {
  const graph = [
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: BRAND.name,
      url: SITE_URL,
      email: BRAND.email,
      description: BRAND.tagline,
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: SITE_URL,
      name: BRAND.name,
      inLanguage: 'sr-RS',
      publisher: { '@id': `${SITE_URL}/#organization` },
    },
    {
      '@type': 'Product',
      name: `${BRAND.name} — galerija sa događaja`,
      description:
        'Web platforma za deljenje fotografija i videa sa događaja. Gosti skeniraju QR kod i šalju sadržaj u zajedničku galeriju bez instalacije aplikacije.',
      brand: { '@id': `${SITE_URL}/#organization` },
      offers: PRICING.filter((p) => p.id !== 'partner').map((p) => ({
        '@type': 'Offer',
        name: p.name,
        price: p.id === 'free' ? '0' : '2490',
        priceCurrency: 'RSD',
        availability: 'https://schema.org/InStock',
        url: `${SITE_URL}/register`,
      })),
    },
    {
      '@type': 'FAQPage',
      mainEntity: FAQ.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    },
  ];

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }),
      }}
    />
  );
}
