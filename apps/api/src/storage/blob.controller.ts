import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Put,
  Query,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { LocalDiskStorageProvider } from './local-disk-storage.provider';

const EXT_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heif',
  gif: 'image/gif',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
  mkv: 'video/x-matroska',
  '3gp': 'video/3gpp',
  zip: 'application/zip',
};

/**
 * Data plane for STORAGE_DRIVER=disk. The guest browser PUTs bytes here (the
 * "presigned upload URL") and GETs them back (gallery images, ZIP downloads).
 * Auth is the short-lived JWT in `?token=` minted by LocalDiskStorageProvider.
 *
 * Only registered when the disk driver is active (see storage.module.ts).
 */
@Controller('blob')
export class BlobController {
  constructor(private readonly disk: LocalDiskStorageProvider) {}

  @Put('*')
  async put(
    @Param('0') key: string,
    @Query('token') token: string,
    @Req() req: Request,
  ): Promise<{ ok: true }> {
    const verified = this.authorize(token, 'blob-put', key);
    const body = req.body as Buffer | undefined;
    if (!Buffer.isBuffer(body) || body.length === 0) {
      throw new BadRequestException('Prazan upload');
    }
    await this.disk.putObject({
      key: verified.key,
      body,
      contentType: req.header('content-type') ?? 'application/octet-stream',
    });
    return { ok: true };
  }

  @Get('*')
  async get(
    @Param('0') key: string,
    @Query('token') token: string,
    @Res() res: Response,
  ): Promise<void> {
    const verified = this.authorize(token, 'blob-get', key);
    if (!(await this.disk.objectExists(verified.key))) {
      res.status(404).json({ message: 'Nije pronađeno' });
      return;
    }
    const ext = verified.key.split('.').pop()?.toLowerCase() ?? '';
    res.setHeader('Content-Type', EXT_MIME[ext] ?? 'application/octet-stream');
    res.setHeader('Cache-Control', 'private, max-age=300');
    if (verified.filename) {
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(verified.filename)}"`,
      );
    }
    const stream = await this.disk.getObjectStream(verified.key);
    stream.on('error', () => res.destroy());
    stream.pipe(res);
  }

  private authorize(
    token: string,
    scope: 'blob-put' | 'blob-get',
    urlKey: string,
  ): { key: string; filename?: string } {
    if (!token) throw new UnauthorizedException('Nedostaje token');
    let verified: { key: string; filename?: string };
    try {
      verified = this.disk.verifyToken(token, scope);
    } catch {
      throw new UnauthorizedException('Nevažeći ili istekao token');
    }
    // The signed key must match the path being accessed.
    if (verified.key.replace(/^\/+/, '') !== decodeURIComponent(urlKey).replace(/^\/+/, '')) {
      throw new UnauthorizedException('Token ne odgovara putanji');
    }
    return verified;
  }
}
