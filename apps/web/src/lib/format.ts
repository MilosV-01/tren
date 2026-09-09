import type { EventType } from '@tren/shared';

const dateFmt = new Intl.DateTimeFormat('sr-Latn-RS', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const dateTimeFmt = new Intl.DateTimeFormat('sr-Latn-RS', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function formatDate(iso: string): string {
  return dateFmt.format(new Date(iso));
}

export function formatDateTime(iso: string): string {
  return dateTimeFmt.format(new Date(iso));
}

const EVENT_TYPE_LABELS: Record<EventType, string> = {
  wedding: 'Venčanje',
  birthday: 'Rođendan',
  corporate: 'Korporativni događaj',
  other: 'Ostalo',
};

export function eventTypeLabel(type: EventType): string {
  return EVENT_TYPE_LABELS[type];
}

export function relativeFromNow(iso: string | null): string {
  if (!iso) return '—';
  const diffMs = new Date(iso).getTime() - Date.now();
  const abs = Math.abs(diffMs);
  const mins = Math.round(abs / 60000);
  const rtf = new Intl.RelativeTimeFormat('sr-Latn-RS', { numeric: 'auto' });
  if (mins < 60) return rtf.format(Math.sign(diffMs) * mins, 'minute');
  const hours = Math.round(mins / 60);
  if (hours < 24) return rtf.format(Math.sign(diffMs) * hours, 'hour');
  const days = Math.round(hours / 24);
  return rtf.format(Math.sign(diffMs) * days, 'day');
}
