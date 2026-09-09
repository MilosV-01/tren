import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { Prisma, type Event } from '@prisma/client';
import {
  RETENTION_DAYS,
  type CreateEventInput,
  type UpdateEventInput,
  type EventDto,
  type EventWithStatsDto,
  type EventStatsDto,
  type PackageTier,
} from '@tren/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AppConfig } from '../config/configuration';
import { buildSlugCandidate } from './slug.util';

const PIN_BCRYPT_ROUNDS = 10;
const SLUG_MAX_ATTEMPTS = 5;

@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  async create(organizationId: string, input: CreateEventInput): Promise<EventWithStatsDto> {
    const retentionDays = this.retentionDaysFor(input.packageTier);
    const pinHash =
      input.visibility === 'pin_protected' && input.pin
        ? await bcrypt.hash(input.pin, PIN_BCRYPT_ROUNDS)
        : null;

    const event = await this.createWithUniqueSlug(input.title, (gallerySlug) => ({
      organizationId,
      title: input.title,
      eventDate: input.eventDate,
      eventType: input.eventType,
      packageTier: input.packageTier,
      visibility: input.visibility,
      pinHash,
      gallerySlug,
      retentionDays,
      expiresAt: this.expiryFrom(new Date(), retentionDays),
    }));

    return this.toEventWithStats(event, this.emptyStats());
  }

  async listForOrganization(organizationId: string): Promise<EventWithStatsDto[]> {
    const events = await this.prisma.event.findMany({
      where: { organizationId },
      orderBy: { eventDate: 'desc' },
    });
    const stats = await this.statsByEvent(events.map((e) => e.id));
    return events.map((e) => this.toEventWithStats(e, stats.get(e.id) ?? this.emptyStats()));
  }

  async getForOrganization(organizationId: string, id: string): Promise<EventWithStatsDto> {
    const event = await this.requireOwnedEvent(organizationId, id);
    const stats = await this.statsByEvent([event.id]);
    return this.toEventWithStats(event, stats.get(event.id) ?? this.emptyStats());
  }

  async update(
    organizationId: string,
    id: string,
    input: UpdateEventInput,
  ): Promise<EventWithStatsDto> {
    const event = await this.requireOwnedEvent(organizationId, id);

    const data: Prisma.EventUpdateInput = {};
    if (input.title !== undefined) data.title = input.title;
    if (input.eventDate !== undefined) data.eventDate = input.eventDate;
    if (input.eventType !== undefined) data.eventType = input.eventType;

    if (input.packageTier !== undefined && input.packageTier !== event.packageTier) {
      const retentionDays = this.retentionDaysFor(input.packageTier);
      data.packageTier = input.packageTier;
      data.retentionDays = retentionDays;
      // Re-anchor expiry off the original creation date so downgrading can't
      // extend an event's life beyond the new tier.
      data.expiresAt = this.expiryFrom(event.createdAt, retentionDays);
    }

    const nextVisibility = input.visibility ?? event.visibility;
    if (nextVisibility === 'pin_protected') {
      if (input.pin) {
        data.pinHash = await bcrypt.hash(input.pin, PIN_BCRYPT_ROUNDS);
      } else if (input.pin === null) {
        throw new BadRequestException('PIN zaštićena galerija ne može ostati bez PIN-a');
      } else if (!event.pinHash) {
        throw new BadRequestException('Uključivanje PIN zaštite zahteva PIN');
      }
      data.visibility = 'pin_protected';
    } else if (nextVisibility === 'public') {
      data.visibility = 'public';
      data.pinHash = null;
    }

    const updated = await this.prisma.event.update({ where: { id: event.id }, data });
    const stats = await this.statsByEvent([updated.id]);
    return this.toEventWithStats(updated, stats.get(updated.id) ?? this.emptyStats());
  }

  async remove(organizationId: string, id: string): Promise<void> {
    await this.requireOwnedEvent(organizationId, id);
    // Cascades to guests / mediaItems / exports via schema relations.
    await this.prisma.event.delete({ where: { id } });
  }

  // --- shared helpers used by other modules --------------------------------

  async requireOwnedEvent(organizationId: string, id: string): Promise<Event> {
    const event = await this.prisma.event.findFirst({ where: { id, organizationId } });
    if (!event) throw new NotFoundException('Događaj nije pronađen');
    return event;
  }

  async findBySlugOrThrow(slug: string): Promise<Event> {
    const event = await this.prisma.event.findUnique({ where: { gallerySlug: slug } });
    if (!event) throw new NotFoundException('Galerija nije pronađena');
    return event;
  }

  isExpired(event: Event): boolean {
    return event.expiresAt.getTime() < Date.now();
  }

  async statsFor(eventId: string): Promise<EventStatsDto> {
    return (await this.statsByEvent([eventId])).get(eventId) ?? this.emptyStats();
  }

  retentionDaysFor(tier: PackageTier): number {
    const fromEnv =
      tier === 'premium'
        ? this.config.get('RETENTION_PREMIUM_DAYS', { infer: true })
        : this.config.get('RETENTION_FREE_DAYS', { infer: true });
    return fromEnv ?? RETENTION_DAYS[tier];
  }

  expiryFrom(anchor: Date, retentionDays: number): Date {
    return new Date(anchor.getTime() + retentionDays * 24 * 60 * 60 * 1000);
  }

  toEventDto(event: Event): EventDto {
    const webOrigin = this.config.get('WEB_ORIGIN', { infer: true });
    return {
      id: event.id,
      title: event.title,
      eventDate: event.eventDate.toISOString(),
      eventType: event.eventType,
      gallerySlug: event.gallerySlug,
      visibility: event.visibility,
      hasPin: !!event.pinHash,
      packageTier: event.packageTier,
      retentionDays: event.retentionDays,
      expiresAt: event.expiresAt.toISOString(),
      createdAt: event.createdAt.toISOString(),
      shareUrl: `${webOrigin}/e/${event.gallerySlug}`,
    };
  }

  // --- internals ---------------------------------------------------------

  private toEventWithStats(event: Event, stats: EventStatsDto): EventWithStatsDto {
    return { ...this.toEventDto(event), stats };
  }

  private async createWithUniqueSlug(
    title: string,
    build: (slug: string) => Prisma.EventUncheckedCreateInput,
  ): Promise<Event> {
    for (let attempt = 0; attempt < SLUG_MAX_ATTEMPTS; attempt++) {
      const slug = buildSlugCandidate(title);
      try {
        return await this.prisma.event.create({ data: build(slug) });
      } catch (err) {
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2002' &&
          attempt < SLUG_MAX_ATTEMPTS - 1
        ) {
          continue; // slug collision — regenerate suffix and retry
        }
        throw err;
      }
    }
    throw new Error('Could not generate a unique gallery slug');
  }

  private emptyStats(): EventStatsDto {
    return { mediaCount: 0, photoCount: 0, videoCount: 0, guestCount: 0, lastUploadAt: null };
  }

  private async statsByEvent(eventIds: string[]): Promise<Map<string, EventStatsDto>> {
    const result = new Map<string, EventStatsDto>();
    if (eventIds.length === 0) return result;

    const [byType, guestCounts, lastUploads] = await Promise.all([
      this.prisma.mediaItem.groupBy({
        by: ['eventId', 'type'],
        where: { eventId: { in: eventIds }, status: 'ready' },
        _count: { _all: true },
      }),
      this.prisma.guest.groupBy({
        by: ['eventId'],
        where: { eventId: { in: eventIds } },
        _count: { _all: true },
      }),
      this.prisma.mediaItem.groupBy({
        by: ['eventId'],
        where: { eventId: { in: eventIds }, status: 'ready' },
        _max: { createdAt: true },
      }),
    ]);

    for (const id of eventIds) result.set(id, this.emptyStats());

    for (const row of byType) {
      const s = result.get(row.eventId)!;
      const n = row._count._all;
      if (row.type === 'photo') s.photoCount = n;
      else s.videoCount = n;
      s.mediaCount += n;
    }
    for (const row of guestCounts) {
      result.get(row.eventId)!.guestCount = row._count._all;
    }
    for (const row of lastUploads) {
      result.get(row.eventId)!.lastUploadAt = row._max.createdAt?.toISOString() ?? null;
    }
    return result;
  }
}
