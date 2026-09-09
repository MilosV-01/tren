import { Body, Controller, Param, Post } from '@nestjs/common';
import { joinEventSchema, type JoinEventInput } from '@tren/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { GuestService } from './guest.service';

@Controller('public/events/:slug/guests')
export class GuestController {
  constructor(private readonly guests: GuestService) {}

  /** Guest "joins" the event with a display name; returns a session token. */
  @Post()
  join(
    @Param('slug') slug: string,
    @Body(new ZodValidationPipe(joinEventSchema)) dto: JoinEventInput,
  ) {
    return this.guests.join(slug, dto);
  }
}
