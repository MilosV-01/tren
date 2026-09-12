import { Inject, Injectable, Logger } from '@nestjs/common';
import { PassThrough } from 'node:stream';
import archiver from 'archiver';
import { PrismaService } from '../prisma/prisma.service';
import { STORAGE_PROVIDER, StorageProvider } from '../storage/storage-provider.interface';

/**
 * Assembles a "download everything" ZIP.
 *
 * Phase 1: runs in-process, one job at a time, kicked off with setImmediate.
 * The job's lifecycle lives entirely in the GalleryExport row, so replacing
 * this with a BullMQ worker later needs no change to the controller/service
 * or the client polling contract.
 *
 * Files are added in chronological ASCENDING order (oldest first) — when you
 * download a whole event you want it laid out the way the day unfolded, which
 * is the opposite of the live gallery grid (newest first).
 */
@Injectable()
export class ExportProcessor {
  private readonly logger = new Logger(ExportProcessor.name);
  private running = false;
  private readonly queue: string[] = [];

  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
  ) {}

  /** Fire-and-forget enqueue. */
  enqueue(exportId: string): void {
    this.queue.push(exportId);
    setImmediate(() => void this.drain());
  }

  private async drain(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      while (this.queue.length > 0) {
        const id = this.queue.shift()!;
        await this.run(id).catch((err) => this.logger.error(`Export ${id} failed`, err as Error));
      }
    } finally {
      this.running = false;
    }
  }

  private async run(exportId: string): Promise<void> {
    try {
      await this.build(exportId);
    } catch (err) {
      this.logger.error(`Export ${exportId} failed`, err as Error);
      await this.prisma.galleryExport
        .update({
          where: { id: exportId },
          data: {
            status: 'failed',
            error: err instanceof Error ? err.message : 'Nepoznata greška',
            completedAt: new Date(),
          },
        })
        .catch(() => undefined);
    }
  }

  private async build(exportId: string): Promise<void> {
    const job = await this.prisma.galleryExport.findUnique({ where: { id: exportId } });
    if (!job || job.status === 'ready' || job.status === 'failed') return;

    await this.prisma.galleryExport.update({
      where: { id: exportId },
      data: { status: 'processing', progress: 1 },
    });

    const media = await this.prisma.mediaItem.findMany({
      where: { eventId: job.eventId, status: 'ready' },
      orderBy: { createdAt: 'asc' },
      include: { guest: true },
    });

    if (media.length === 0) {
      await this.prisma.galleryExport.update({
        where: { id: exportId },
        data: { status: 'failed', error: 'Galerija je prazna', completedAt: new Date() },
      });
      return;
    }

    const zipKey = `events/${job.eventId}/exports/${exportId}.zip`;
    const archive = archiver('zip', { zlib: { level: 6 } });
    const passThrough = new PassThrough();
    archive.pipe(passThrough);

    const uploadPromise = this.storage.putObject({
      key: zipKey,
      body: passThrough,
      contentType: 'application/zip',
    });

    archive.on('warning', (err) => this.logger.warn(`archiver warning: ${err.message}`));
    // Surface archive errors through the stream so uploadPromise / finalize reject
    // and the outer try/catch in drain() marks the job failed.
    archive.on('error', (err) => passThrough.destroy(err));

    const seen = new Set<string>();
    let included = 0;
    for (let i = 0; i < media.length; i++) {
      const m = media[i];
      // A file can be missing from disk (e.g. an ephemeral-storage restart
      // wiped it) without that being a reason to fail the whole ZIP — skip it
      // and keep going instead of letting one bad stream hang the archive.
      try {
        if (!(await this.storage.objectExists(m.storageKey))) {
          this.logger.warn(`Export ${exportId}: skipping missing object ${m.storageKey}`);
          continue;
        }
        const stream = await this.storage.getObjectStream(m.storageKey);
        archive.append(stream, { name: entryName(i + 1, m.guest.displayName, m.filename, seen) });
        included += 1;
      } catch (err) {
        this.logger.warn(`Export ${exportId}: skipping ${m.storageKey} (${(err as Error).message})`);
      }

      if (i % 5 === 0 || i === media.length - 1) {
        await this.prisma.galleryExport.update({
          where: { id: exportId },
          data: { progress: Math.min(95, Math.floor(((i + 1) / media.length) * 90)) },
        });
      }
    }

    if (included === 0) {
      passThrough.destroy();
      await this.prisma.galleryExport.update({
        where: { id: exportId },
        data: {
          status: 'failed',
          error: 'Fotografije nisu dostupne na serveru — pokušaj ponovo kasnije',
          completedAt: new Date(),
        },
      });
      return;
    }

    await archive.finalize();
    await uploadPromise;

    await this.prisma.galleryExport.update({
      where: { id: exportId },
      data: {
        status: 'ready',
        progress: 100,
        storageKey: zipKey,
        fileCount: included,
        completedAt: new Date(),
      },
    });
    this.logger.log(`Export ${exportId} ready (${included}/${media.length} files)`);
  }
}

/** `0001_Ana-Petrovic_IMG_2231.jpg`, de-duplicated. */
function entryName(seq: number, guest: string, filename: string, seen: Set<string>): string {
  const safeGuest = guest.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '') || 'gost';
  const safeFile = filename.replace(/[/\\]/g, '_');
  let name = `${String(seq).padStart(4, '0')}_${safeGuest}_${safeFile}`;
  let n = 1;
  while (seen.has(name)) name = `${String(seq).padStart(4, '0')}_${safeGuest}_${n++}_${safeFile}`;
  seen.add(name);
  return name;
}
