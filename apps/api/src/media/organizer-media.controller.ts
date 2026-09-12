import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MediaService } from './media.service';

/** Organizer-only view of an event's full media feed (every guest's photos). */
@Controller('events/:id/media')
@UseGuards(JwtAuthGuard)
export class OrganizerMediaController {
  constructor(private readonly media: MediaService) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query() query: unknown,
  ) {
    return this.media.listForOrganizer(user.organizationId, id, query);
  }
}
