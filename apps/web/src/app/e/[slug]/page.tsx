import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { PublicEventDto } from '@tren/shared';
import { serverApi } from '@/lib/server-api';
import { ApiError } from '@/lib/api-error';
import { formatDate } from '@/lib/format';
import { GuestUploader } from '@/components/guest-uploader';
import { LogoMark } from '@/components/site/logo';

export const dynamic = 'force-dynamic';

async function loadEvent(slug: string): Promise<PublicEventDto> {
  try {
    return await serverApi<PublicEventDto>(`/public/events/${slug}`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  try {
    const event = await serverApi<PublicEventDto>(`/public/events/${params.slug}`);
    return {
      title: `${event.title} — pošalji fotografije`,
      description: `Podeli svoje fotografije i video sa događaja „${event.title}". Bez aplikacije — skeniraj, upiši ime, pošalji.`,
      robots: { index: false, follow: false },
    };
  } catch {
    return { title: 'Galerija sa događaja', robots: { index: false, follow: false } };
  }
}

export default async function GuestUploadPage({ params }: { params: { slug: string } }) {
  const event = await loadEvent(params.slug);

  return (
    <main className="mx-auto min-h-screen max-w-md px-5 pb-16 pt-10">
      <header className="mb-8 text-center">
        <LogoMark className="mx-auto mb-4 h-10 w-10 text-surface-900" />
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary-600">
          Zajednička galerija
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-surface-900">{event.title}</h1>
        <p className="mt-1 text-sm text-surface-500">{formatDate(event.eventDate)}</p>
      </header>

      <GuestUploader slug={event.gallerySlug} eventTitle={event.title} isExpired={event.isExpired} />

      <div className="mt-10 text-center">
        <Link
          href={`/e/${event.gallerySlug}/gallery`}
          className="text-sm font-medium text-primary-700 hover:underline"
        >
          Pogledaj celu galeriju →
        </Link>
      </div>
      <p className="mt-6 text-center text-xs text-surface-400">
        Pokreće <span className="font-medium text-surface-500">Tren</span>
      </p>
    </main>
  );
}
