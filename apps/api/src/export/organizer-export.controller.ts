import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { ExportService } from './export.service';

/** Organizer-only ZIP export of the whole event (every guest's photos). */
@Controller('events/:id/exports')
@UseGuards(JwtAuthGuard)
export class OrganizerExportController {
  constructor(private readonly exports: ExportService) {}

  @Post()
  request(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.exports.requestExportForOrganizer(user.organizationId, id);
  }

  @Get(':exportId')
  status(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('exportId') exportId: string,
  ) {
    return this.exports.getStatusForOrganizer(user.organizationId, id, exportId);
  }
}
