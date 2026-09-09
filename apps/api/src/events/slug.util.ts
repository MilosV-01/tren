import { customAlphabet } from 'nanoid';

// Lowercase alphanumerics only — readable in a URL and when typed from a QR fallback.
const suffix = customAlphabet('23456789abcdefghijkmnpqrstuvwxyz', 6);

const SERBIAN_LATIN: Record<string, string> = {
  'č': 'c', // č
  'ć': 'c', // ć
  'đ': 'dj', // đ
  'š': 's', // š
  'ž': 'z', // ž
};

/** "Ana & Marko — Vencanje" -> "ana-marko-vencanje". */
export function slugifyTitle(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[čćđšž]/g, (ch) => SERBIAN_LATIN[ch] ?? ch)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '');
  return base || 'event';
}

/** Slug candidate: `<slugified-title>-<6 char suffix>`. Suffix keeps it unique. */
export function buildSlugCandidate(title: string): string {
  return `${slugifyTitle(title)}-${suffix()}`;
}
