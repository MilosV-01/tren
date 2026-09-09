import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import type { Guest } from '@prisma/client';
import { GUEST_SESSION_HEADER } from '@tren/shared';
import { PrismaService } from '../prisma/prisma.service';

/** Resolves the guest identified by the `x-guest-session` header for an event. */
@Injectable()
export class GuestContextService {
  constructor(private readonly prisma: PrismaService) {}

  async requireGuest(eventId: string, req: Request): Promise<Guest> {
    const token = req.header(GUEST_SESSION_HEADER);
    if (!token) throw new UnauthorizedException('Nedostaje gost sesija — unesi ime da nastaviš');
    const guest = await this.prisma.guest.findUnique({ where: { sessionToken: token } });
    if (!guest || guest.eventId !== eventId) {
      throw new UnauthorizedException('Nevažeća gost sesija za ovaj događaj');
    }
    return guest;
  }
}
