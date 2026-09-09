import { ForbiddenException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import type { Event } from '@prisma/client';
import { GALLERY_ACCESS_HEADER } from '@tren/shared';

/**
 * Decides whether a request may view / download a gallery.
 *
 *  - `public` events: always allowed.
 *  - `pin_protected` events: allowed if the request carries either
 *      a) a gallery access token (issued after a correct PIN), or
 *      b) an organizer bearer token for the owning organization.
 *
 * Both tokens are plain JWTs signed with JWT_SECRET; the gallery token is
 * scoped so it can't be used as an organizer session and vice versa.
 */
@Injectable()
export class GalleryAccessService {
  private static readonly GALLERY_TTL_SECONDS = 60 * 60 * 6;

  constructor(private readonly jwt: JwtService) {}

  issueGalleryToken(eventId: string): { accessToken: string; expiresIn: number } {
    const expiresIn = GalleryAccessService.GALLERY_TTL_SECONDS;
    const accessToken = this.jwt.sign({ scope: 'gallery', eid: eventId }, { expiresIn });
    return { accessToken, expiresIn };
  }

  canAccess(event: Event, req: Request): boolean {
    if (event.visibility === 'public') return true;
    const galleryToken = req.header(GALLERY_ACCESS_HEADER);
    if (galleryToken && this.eventIdFromGalleryToken(galleryToken) === event.id) return true;
    const org = this.organizationIdFromBearer(req);
    return !!org && org === event.organizationId;
  }

  assertCanAccess(event: Event, req: Request): void {
    if (!this.canAccess(event, req)) {
      throw new ForbiddenException('Galerija je zaključana PIN-om');
    }
  }

  private eventIdFromGalleryToken(token: string): string | null {
    try {
      const payload = this.jwt.verify<{ scope?: string; eid?: string }>(token);
      return payload.scope === 'gallery' ? (payload.eid ?? null) : null;
    } catch {
      return null;
    }
  }

  private organizationIdFromBearer(req: Request): string | null {
    const header = req.header('authorization');
    if (!header?.startsWith('Bearer ')) return null;
    try {
      const payload = this.jwt.verify<{ org?: string }>(header.slice(7));
      return payload.org ?? null;
    } catch {
      return null;
    }
  }
}
