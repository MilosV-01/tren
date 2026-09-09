import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// import { Cron, CronExpression } from '@nestjs/schedule';
import { AppConfig } from '../config/configuration';
import { PrismaService } from '../prisma/prisma.service';
import { STORAGE_PROVIDER, StorageProvider } from '../storage/storage-provider.interface';

export interface PurgeSummary {
  events: number;
  deletedMedia: number;
  deletedObjects: number;
  deletedExports: number;
}

/**
 * Retention enforcement.
 *
 * Each Event carries `expiresAt` (= createdAt + retentionDays, where
 * retentionDays comes from packageTier: Free 7d / Premium 90d). Once an event
 * is past `expiresAt`, its media + exports are eligible for deletion. The Event
 * row itself is kept so it still shows in the organizer's dashboard, just empty.
 *
 * Phase 1 ships the logic and a wired-but-disabled cron. Flip
 * CLEANUP_CRON_ENABLED=true (and uncomment the @Cron decorator) to activate it,
 * or call `purgeExpiredMedia()` from a script / admin endpoint.
 */
@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<AppConfig, true>,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
  ) {}

  // Left in place for Phase 2. Runs daily once uncommented.
  // @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleRetentionCron(): Promise<void> {
    if (!this.config.get('CLEANUP_CRON_ENABLED', { infer: true })) return;
    const summary = await this.purgeExpiredMedia();
    this.logger.log(
      `Retention run: ${summary.deletedMedia} media / ${summary.deletedObjects} objects across ${summary.events} expired events`,
    );
  }

  /** Deletes storage objects + DB rows for media/exports of expired events. */
  async purgeExpiredMedia(now: Date = new Date()): Promise<PurgeSummary> {
    const expired = await this.prisma.event.findMany({
      where: { expiresAt: { lt: now } },
      select: { id: true },
    });

    const summary: PurgeSummary = {
      events: expired.length,
      deletedMedia: 0,
      deletedObjects: 0,
      deletedExports: 0,
    };
    if (expired.length === 0) return summary;

    const eventIds = expired.map((e) => e.id);

    const media = await this.prisma.mediaItem.findMany({
      where: { eventId: { in: eventIds } },
      select: { id: true, storageKey: true, thumbnailKey: true },
    });
    const exportJobs = await this.prisma.galleryExport.findMany({
      where: { eventId: { in: eventIds }, storageKey: { not: null } },
      select: { id: true, storageKey: true },
    });

    const objectKeys = [
      ...media.flatMap((m) => [m.storageKey, m.thumbnailKey].filter((k): k is string => !!k)),
      ...exportJobs.map((e) => e.storageKey!).filter(Boolean),
    ];

    if (objectKeys.length > 0) {
      await this.storage.deleteObjects(objectKeys);
    }

    const [deletedMedia, deletedExports] = await this.prisma.$transaction([
      this.prisma.mediaItem.deleteMany({ where: { eventId: { in: eventIds } } }),
      this.prisma.galleryExport.deleteMany({ where: { eventId: { in: eventIds } } }),
    ]);

    summary.deletedMedia = deletedMedia.count;
    summary.deletedExports = deletedExports.count;
    summary.deletedObjects = objectKeys.length;
    return summary;
  }
}
