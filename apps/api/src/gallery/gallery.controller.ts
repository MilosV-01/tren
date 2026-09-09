import { Body, Controller, Get, HttpCode, Param, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { verifyPinSchema, type VerifyPinInput } from '@tren/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { MediaService } from '../media/media.service';
import { GalleryService } from './gallery.service';

@Controller('public/events/:slug')
export class GalleryController {
  constructor(
    private readonly gallery: GalleryService,
    private readonly media: MediaService,
  ) {}

  /** Public event metadata for the guest upload + gallery pages. */
  @Get()
  meta(@Param('slug') slug: string, @Req() req: Request) {
    return this.gallery.getPublicMeta(slug, req);
  }

  /** Exchange a correct PIN for a short-lived gallery access token. */
  @Post('verify-pin')
  @HttpCode(200)
  verifyPin(
    @Param('slug') slug: string,
    @Body(new ZodValidationPipe(verifyPinSchema)) dto: VerifyPinInput,
  ) {
    return this.gallery.verifyPin(slug, dto);
  }

  /** Chronological media grid (newest first), cursor-paginated. */
  @Get('media')
  listMedia(@Param('slug') slug: string, @Req() req: Request, @Query() query: unknown) {
    return this.media.listGallery(slug, req, query);
  }
}
