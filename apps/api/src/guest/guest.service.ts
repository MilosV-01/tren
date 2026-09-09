import { BadRequestException, Injectable } from '@nestjs/common';
import { nanoid } from 'nanoid';
import type { GuestSessionDto, JoinEventInput } from '@tren/shared';
import { PrismaService } from '../prisma/prisma.service';
import { EventsService } from '../events/events.service';

@Injectable()
export class GuestService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsService,
  ) {}

  async join(slug: string, input: JoinEventInput): Promise<GuestSessionDto> {
    const event = await this.events.findBySlugOrThrow(slug);
    if (this.events.isExpired(event)) {
      throw new BadRequestException('Ovaj događaj više ne prima nove fotografije');
    }

    const guest = await this.prisma.guest.create({
      data: {
        eventId: event.id,
        displayName: input.displayName,
        sessionToken: nanoid(32),
      },
    });

    return {
      guestId: guest.id,
      sessionToken: guest.sessionToken,
      displayName: guest.displayName,
      eventSlug: event.gallerySlug,
    };
  }
}
