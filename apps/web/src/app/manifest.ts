import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Tren — galerija sa vašeg događaja',
    short_name: 'Tren',
    description:
      'Gosti skeniraju QR kod i šalju fotografije i video u zajedničku galeriju. Bez aplikacije.',
    start_url: '/',
    display: 'standalone',
    background_color: '#fafaf9',
    theme_color: '#e11d48',
    lang: 'sr-RS',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
