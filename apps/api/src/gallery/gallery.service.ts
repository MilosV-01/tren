import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import type { Request } from 'express';
import type { PublicEventDto, VerifyPinInput, VerifyPinResultDto } from '@tren/shared';
import { AppConfig } from '../config/configuration';
import { EventsService } from '../events/events.service';
import { GalleryAccessService } from '../public/gallery-access.service';

@Injectable()
export class GalleryService {
  constructor(
    private readonly config: ConfigService<AppConfig, true>,
    private readonly events: EventsService,
    private readonly galleryAccess: GalleryAccessService,
  ) {}

  async getPublicMeta(slug: string, req: Request): Promise<PublicEventDto> {
    const event = await this.events.findBySlugOrThrow(slug);
    return {
      title: event.title,
      eventDate: event.eventDate.toISOString(),
      eventType: event.eventType,
      gallerySlug: event.gallerySlug,
      visibility: event.visibility,
      unlocked: this.galleryAccess.canAccess(event, req),
      isExpired: this.events.isExpired(event),
    };
  }

  async verifyPin(slug: string, input: VerifyPinInput): Promise<VerifyPinResultDto> {
    const event = await this.events.findBySlugOrThrow(slug);
    if (event.visibility !== 'pin_protected' || !event.pinHash) {
      throw new BadRequestException('Ova galerija nije PIN zaštićena');
    }
    const ok = await bcrypt.compare(input.pin, event.pinHash);
    if (!ok) throw new UnauthorizedException('Pogrešan PIN');

    return this.galleryAccess.issueGalleryToken(event.id);
  }
}
