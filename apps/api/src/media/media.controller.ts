import { Body, Controller, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import {
  confirmUploadSchema,
  uploadUrlRequestSchema,
  type ConfirmUploadInput,
  type UploadUrlRequest,
} from '@tren/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { MediaService } from './media.service';

/**
 * Guest-facing presigned upload flow. No JWT — the guest is identified by the
 * `x-guest-session` header (see GuestContextService).
 *
 * NOTE: the guest only ever knows the gallery slug, so these routes are keyed
 * by `:slug` rather than the internal event id used in the original spec draft.
 */
@Controller('public/events/:slug/media')
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Post('upload-url')
  issueUploadUrl(
    @Param('slug') slug: string,
    @Req() req: Request,
    @Body(new ZodValidationPipe(uploadUrlRequestSchema)) dto: UploadUrlRequest,
  ) {
    return this.media.issueUploadTicket(slug, req, dto);
  }

  @Post('confirm')
  confirm(
    @Param('slug') slug: string,
    @Req() req: Request,
    @Body(new ZodValidationPipe(confirmUploadSchema)) dto: ConfirmUploadInput,
  ) {
    return this.media.confirmUpload(slug, req, dto);
  }
}
