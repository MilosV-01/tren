import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, stat, unlink } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { AppConfig } from '../config/configuration';
import { PresignedUpload, StorageProvider } from './storage-provider.interface';

/**
 * Filesystem-backed storage. No S3/R2 account needed — files live on a disk
 * mount and are served / received through the API's own `/api/blob/*` routes
 * (BlobController). "Presigned" URLs here are just short-lived JWTs.
 *
 * Trade-off vs. S3: uploads/downloads pass through the API process instead of
 * going straight to object storage. Fine for MVP / small events; switch
 * STORAGE_DRIVER=s3 to go direct again with zero other changes.
 */
@Injectable()
export class LocalDiskStorageProvider implements StorageProvider {
  private readonly logger = new Logger(LocalDiskStorageProvider.name);
  private readonly root: string;
  private readonly blobBase: string;
  private readonly uploadTtl: number;
  private readonly downloadTtl: number;

  constructor(
    config: ConfigService<AppConfig, true>,
    private readonly jwt: JwtService,
  ) {
    this.root = resolve(config.get('STORAGE_DISK_PATH', { infer: true }));
    this.uploadTtl = config.get('UPLOAD_URL_TTL', { infer: true });
    this.downloadTtl = config.get('DOWNLOAD_URL_TTL', { infer: true });

    // Absolute base the browser uses to reach the blob routes.
    const apiUrl = (
      config.get('API_PUBLIC_URL', { infer: true }) ||
      process.env.RENDER_EXTERNAL_URL ||
      `http://localhost:${config.get('API_PORT', { infer: true })}`
    ).replace(/\/$/, '');
    this.blobBase = `${apiUrl}/api/blob`;
    this.logger.log(`Disk storage at ${this.root}, served from ${this.blobBase}`);
  }

  /** Verifies a blob token and returns the object key it authorizes. */
  verifyToken(token: string, scope: 'blob-put' | 'blob-get'): { key: string; filename?: string } {
    const payload = this.jwt.verify<{ k: string; s: string; fn?: string }>(token);
    if (payload.s !== scope) throw new Error('wrong scope');
    return { key: payload.k, filename: payload.fn };
  }

  async createUploadUrl(params: {
    key: string;
    contentType: string;
    expiresIn?: number;
  }): Promise<PresignedUpload> {
    const expiresIn = params.expiresIn ?? this.uploadTtl;
    const token = this.jwt.sign({ k: params.key, s: 'blob-put' }, { expiresIn });
    return {
      url: `${this.blobBase}/${encodeKey(params.key)}?token=${token}`,
      requiredHeaders: { 'Content-Type': params.contentType },
      expiresIn,
    };
  }

  async createDownloadUrl(params: {
    key: string;
    expiresIn?: number;
    downloadFilename?: string;
  }): Promise<string> {
    const token = this.jwt.sign(
      { k: params.key, s: 'blob-get', ...(params.downloadFilename ? { fn: params.downloadFilename } : {}) },
      { expiresIn: params.expiresIn ?? this.downloadTtl },
    );
    return `${this.blobBase}/${encodeKey(params.key)}?token=${token}`;
  }

  async putObject(params: { key: string; body: Buffer | Readable; contentType: string }): Promise<void> {
    const target = this.pathFor(params.key);
    await mkdir(dirname(target), { recursive: true });
    if (Buffer.isBuffer(params.body)) {
      await pipeline(Readable.from(params.body), createWriteStream(target));
    } else {
      await pipeline(params.body, createWriteStream(target));
    }
  }

  async getObjectStream(key: string): Promise<Readable> {
    return createReadStream(this.pathFor(key));
  }

  async objectExists(key: string): Promise<boolean> {
    try {
      await stat(this.pathFor(key));
      return true;
    } catch {
      return false;
    }
  }

  async deleteObjects(keys: string[]): Promise<void> {
    await Promise.all(
      keys.map((k) => unlink(this.pathFor(k)).catch(() => undefined)),
    );
  }

  /** Resolve a key to a path, guarding against traversal outside the root. */
  private pathFor(key: string): string {
    const clean = key.replace(/\\/g, '/').replace(/^\/+/, '');
    const full = resolve(this.root, clean);
    if (full !== this.root && !full.startsWith(this.root + sep)) {
      throw new Error('invalid storage key');
    }
    return full;
  }
}

function encodeKey(key: string): string {
  return key.split('/').map(encodeURIComponent).join('/');
}
