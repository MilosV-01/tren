import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { nanoid } from 'nanoid';
import type { MediaItem, Guest } from '@prisma/client';
import {
  mimeToMediaType,
  paginationQuerySchema,
  type ConfirmUploadInput,
  type MediaItemDto,
  type Paginated,
  type UploadTicketDto,
  type UploadUrlRequest,
} from '@tren/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AppConfig } from '../config/configuration';
import { EventsService } from '../events/events.service';
import { GuestContextService } from '../public/guest-context.service';
import { GalleryAccessService } from '../public/gallery-access.service';
import { STORAGE_PROVIDER, StorageProvider } from '../storage/storage-provider.interface';

@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<AppConfig, true>,
    private readonly events: EventsService,
    private readonly guests: GuestContextService,
    private readonly galleryAccess: GalleryAccessService,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
  ) {}

  /**
   * Step 1 of the presigned upload flow.
   * Validates the request, records a MediaItem in `uploading` state, and hands
   * back a presigned PUT URL. The bytes never pass through the API — the browser
   * PUTs them straight to object storage.
   */
  async issueUploadTicket(
    slug: string,
    req: Request,
    dto: UploadUrlRequest,
  ): Promise<UploadTicketDto> {
    const event = await this.events.findBySlugOrThrow(slug);
    if (this.events.isExpired(event)) {
      throw new BadRequestException('Ovaj događaj više ne prima nove fotografije');
    }

    const guest = await this.guests.requireGuest(event.id, req);

    const maxBytes = this.config.get('MAX_UPLOAD_BYTES', { infer: true });
    if (dto.sizeBytes > maxBytes) {
      throw new PayloadTooLargeException(
        `Fajl je prevelik (maksimum ${Math.floor(maxBytes / 1024 / 1024)} MB)`,
      );
    }

    const type = mimeToMediaType(dto.contentType);
    if (!type) throw new BadRequestException('Nepodržan tip fajla');

    // `objectId` names the stored object; the MediaItem cuid is a separate
    // internal id used only by the confirm step.
    const objectId = nanoid(21);
    const ext = extensionFor(dto.filename, dto.contentType);
    const storageKey = `events/${event.id}/media/${objectId}${ext}`;

    const media = await this.prisma.mediaItem.create({
      data: {
        eventId: event.id,
        guestId: guest.id,
        storageKey,
        type,
        status: 'uploading',
        filename: dto.filename,
        contentType: dto.contentType,
        sizeBytes: dto.sizeBytes,
      },
    });

    const upload = await this.storage.createUploadUrl({
      key: storageKey,
      contentType: dto.contentType,
      maxBytes,
    });

    return {
      mediaId: media.id,
      storageKey,
      uploadUrl: upload.url,
      requiredHeaders: upload.requiredHeaders,
      expiresIn: upload.expiresIn,
    };
  }

  /**
   * Step 2: the client reports the PUT succeeded. We verify the object really
   * landed in storage before flipping the row to `ready` (so a failed browser
   * upload never shows up as a broken tile in the gallery).
   */
  async confirmUpload(
    slug: string,
    req: Request,
    dto: ConfirmUploadInput,
  ): Promise<MediaItemDto> {
    const event = await this.events.findBySlugOrThrow(slug);
    const guest = await this.guests.requireGuest(event.id, req);

    const media = await this.prisma.mediaItem.findUnique({ where: { id: dto.mediaId } });
    if (!media || media.eventId !== event.id || media.guestId !== guest.id) {
      throw new NotFoundException('Stavka nije pronađena');
    }
    if (media.status === 'ready') return this.toDto(media, guest.displayName);

    const exists = await this.storage.objectExists(media.storageKey);
    if (!exists) {
      await this.prisma.mediaItem.update({
        where: { id: media.id },
        data: { status: 'failed' },
      });
      throw new BadRequestException('Upload nije stigao do skladišta — pokušaj ponovo');
    }

    const ready = await this.prisma.mediaItem.update({
      where: { id: media.id },
      data: { status: 'ready' },
    });
    return this.toDto(ready, guest.displayName);
  }

  /**
   * A guest's own feed, newest first, cursor-paginated. Guests only ever see
   * what they personally captured — the shared, everyone-sees-everything view
   * is now organizer-only (see `listForOrganizer`).
   */
  async listGallery(
    slug: string,
    req: Request,
    rawQuery: unknown,
  ): Promise<Paginated<MediaItemDto>> {
    const { cursor, limit } = paginationQuerySchema.parse(rawQuery);
    const event = await this.events.findBySlugOrThrow(slug);
    this.galleryAccess.assertCanAccess(event, req);
    const guest = await this.guests.requireGuest(event.id, req);

    const rows = await this.prisma.mediaItem.findMany({
      where: { eventId: event.id, status: 'ready', guestId: guest.id },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: { guest: true },
    });

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const items = await Promise.all(page.map((m) => this.toDto(m, m.guest.displayName)));

    return { items, nextCursor: hasMore ? page[page.length - 1].id : null };
  }

  /** The full event feed (every guest's photos) — organizer-only. */
  async listForOrganizer(
    organizationId: string,
    eventId: string,
    rawQuery: unknown,
  ): Promise<Paginated<MediaItemDto>> {
    const { cursor, limit } = paginationQuerySchema.parse(rawQuery);
    await this.events.requireOwnedEvent(organizationId, eventId);

    const rows = await this.prisma.mediaItem.findMany({
      where: { eventId, status: 'ready' },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: { guest: true },
    });

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const items = await Promise.all(page.map((m) => this.toDto(m, m.guest.displayName)));

    return { items, nextCursor: hasMore ? page[page.length - 1].id : null };
  }

  async toDto(media: MediaItem, guestName: string): Promise<MediaItemDto> {
    const [url, thumbnailUrl, downloadUrl] = await Promise.all([
      this.storage.createDownloadUrl({ key: media.storageKey }),
      media.thumbnailKey
        ? this.storage.createDownloadUrl({ key: media.thumbnailKey })
        : this.storage.createDownloadUrl({ key: media.storageKey }),
      this.storage.createDownloadUrl({
        key: media.storageKey,
        downloadFilename: media.filename || `tren-${media.id}${extensionFor(media.filename, media.contentType)}`,
      }),
    ]);
    return {
      id: media.id,
      type: media.type,
      status: media.status,
      url,
      thumbnailUrl,
      downloadUrl,
      guestName,
      createdAt: media.createdAt.toISOString(),
    };
  }
}

/** Best-effort extension: trust the filename, fall back to a MIME map. */
function extensionFor(filename: string, contentType: string): string {
  const fromName = filename.includes('.') ? `.${filename.split('.').pop()}` : '';
  if (fromName && fromName.length <= 6) return fromName.toLowerCase();
  const map: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/heic': '.heic',
    'image/heif': '.heif',
    'image/gif': '.gif',
    'video/mp4': '.mp4',
    'video/quicktime': '.mov',
    'video/webm': '.webm',
    'video/x-matroska': '.mkv',
    'video/3gpp': '.3gp',
  };
  return map[contentType] ?? '';
}
