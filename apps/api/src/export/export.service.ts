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

  /**
   * Exporting the whole gallery as a ZIP is an organizer-only capability (see
   * `requestExportForOrganizer`) — guests only ever see their own photos, so
   * they have nothing to export "everything" from anymore. This PIN-gated
   * entry point is kept only in case a future package wants to re-offer it
   * to guests explicitly; nothing currently calls it from the guest UI.
   */
  async requestExport(slug: string, req: Request): Promise<ExportJobDto> {
    const event = await this.events.findBySlugOrThrow(slug);
    this.galleryAccess.assertCanAccess(event, req);
    return this.requestExportForEvent(event.id);
  }

  async requestExportForOrganizer(organizationId: string, eventId: string): Promise<ExportJobDto> {
    const event = await this.events.requireOwnedEvent(organizationId, eventId);
    return this.requestExportForEvent(event.id);
  }

  async getStatus(slug: string, req: Request, exportId: string): Promise<ExportJobDto> {
    const event = await this.events.findBySlugOrThrow(slug);
    this.galleryAccess.assertCanAccess(event, req);
    return this.getStatusForEvent(event.id, exportId);
  }

  async getStatusForOrganizer(
    organizationId: string,
    eventId: string,
    exportId: string,
  ): Promise<ExportJobDto> {
    const event = await this.events.requireOwnedEvent(organizationId, eventId);
    return this.getStatusForEvent(event.id, exportId);
  }

  private async requestExportForEvent(eventId: string): Promise<ExportJobDto> {
    const readyCount = await this.prisma.mediaItem.count({
      where: { eventId, status: 'ready' },
    });
    if (readyCount === 0) throw new BadRequestException('Galerija je prazna — nema šta da se preuzme');

    const recent = await this.prisma.galleryExport.findFirst({
      where: {
        eventId,
        status: { in: ['pending', 'processing'] },
        createdAt: { gt: new Date(Date.now() - REUSE_WINDOW_MS) },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (recent) return this.toDto(recent);

    const job = await this.prisma.galleryExport.create({
      data: { eventId, status: 'pending' },
    });
    this.processor.enqueue(job.id);
    return this.toDto(job);
  }

  private async getStatusForEvent(eventId: string, exportId: string): Promise<ExportJobDto> {
    const job = await this.prisma.galleryExport.findUnique({ where: { id: exportId } });
    if (!job || job.eventId !== eventId) throw new NotFoundException('Export nije pronađen');
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
