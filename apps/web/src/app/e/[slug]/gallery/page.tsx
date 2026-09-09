import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { PublicEventDto } from '@tren/shared';
import { serverApi } from '@/lib/server-api';
import { ApiError } from '@/lib/api-error';
import { GalleryView, GalleryHeader } from '@/components/gallery-view';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  try {
    const event = await serverApi<PublicEventDto>(`/public/events/${params.slug}`);
    return {
      title: `Galerija — ${event.title}`,
      robots: { index: false, follow: false },
    };
  } catch {
    return { title: 'Galerija', robots: { index: false, follow: false } };
  }
}

export default async function GalleryPage({ params }: { params: { slug: string } }) {
  let event: PublicEventDto;
  try {
    event = await serverApi<PublicEventDto>(`/public/events/${params.slug}`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-5 pb-16 pt-10">
      <GalleryHeader event={event} />
      <GalleryView event={event} />
      <div className="mt-12 text-center">
        <Link
          href={`/e/${event.gallerySlug}`}
          className="btn-secondary text-sm"
        >
          ← Dodaj svoje fotografije
        </Link>
      </div>
    </main>
  );
}
