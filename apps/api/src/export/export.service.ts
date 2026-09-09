import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import type { Request } from 'express';
import type { GalleryExport } from '@prisma/client';
import type { ExportJobDto } from '@tren/shared';
import { PrismaService } from '../prisma/prisma.service';
import { EventsService } from '../events/events.service';
import { GalleryAccessService } from '../public/gallery-access.service';
import { STORAGE_PROVIDER, StorageProvider } from '../storage/storage-provider.interface';
import { ExportProcessor } from './export.processor';

// If an unfinished job was created this recently, reuse it instead of starting another.
const REUSE_WINDOW_MS = 10 * 60 * 1000;

@Injectable()
export class ExportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsService,
    private readonly galleryAccess: GalleryAccessService,
    private readonly processor: ExportProcessor,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
  ) {}

  async requestExport(slug: string, req: Request): Promise<ExportJobDto> {
    const event = await this.events.findBySlugOrThrow(slug);
    this.galleryAccess.assertCanAccess(event, req);

    const readyCount = await this.prisma.mediaItem.count({
      where: { eventId: event.id, status: 'ready' },
    });
    if (readyCount === 0) throw new BadRequestException('Galerija je prazna — nema šta da se preuzme');

    const recent = await this.prisma.galleryExport.findFirst({
      where: {
        eventId: event.id,
        status: { in: ['pending', 'processing'] },
        createdAt: { gt: new Date(Date.now() - REUSE_WINDOW_MS) },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (recent) return this.toDto(recent);

    const job = await this.prisma.galleryExport.create({
      data: { eventId: event.id, status: 'pending' },
    });
    this.processor.enqueue(job.id);
    return this.toDto(job);
  }

  async getStatus(slug: string, req: Request, exportId: string): Promise<ExportJobDto> {
    const event = await this.events.findBySlugOrThrow(slug);
    this.galleryAccess.assertCanAccess(event, req);

    const job = await this.prisma.galleryExport.findUnique({ where: { id: exportId } });
    if (!job || job.eventId !== event.id) throw new NotFoundException('Export nije pronađen');
    return this.toDto(job);
  }

  private async toDto(job: GalleryExport): Promise<ExportJobDto> {
    const downloadUrl =
      job.status === 'ready' && job.storageKey
        ? await this.storage.createDownloadUrl({
            key: job.storageKey,
            downloadFilename: 'tren-galerija.zip',
          })
        : null;
    return {
      id: job.id,
      status: job.status,
      progress: job.progress,
      downloadUrl,
      fileCount: job.fileCount,
      createdAt: job.createdAt.toISOString(),
      completedAt: job.completedAt?.toISOString() ?? null,
      error: job.error,
    };
  }
}
