import { Controller, Get, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { ExportService } from './export.service';

@Controller('public/events/:slug/exports')
export class ExportController {
  constructor(private readonly exports: ExportService) {}

  /** Start (or reuse) an async ZIP export of the whole gallery. */
  @Post()
  request(@Param('slug') slug: string, @Req() req: Request) {
    return this.exports.requestExport(slug, req);
  }

  /** Poll for status; `downloadUrl` is populated once `status === 'ready'`. */
  @Get(':exportId')
  status(
    @Param('slug') slug: string,
    @Param('exportId') exportId: string,
    @Req() req: Request,
  ) {
    return this.exports.getStatus(slug, req, exportId);
  }
}
