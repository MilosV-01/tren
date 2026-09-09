import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Readable } from 'node:stream';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectsCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Upload } from '@aws-sdk/lib-storage';
import { AppConfig } from '../config/configuration';
import { PresignedUpload, StorageProvider } from './storage-provider.interface';

/**
 * S3-compatible implementation. Reads S3_* env (see .env.example). For MinIO/R2
 * S3_ENDPOINT + S3_FORCE_PATH_STYLE=true are required; for real AWS S3 leave
 * S3_ENDPOINT empty and set S3_FORCE_PATH_STYLE=false.
 *
 * Two clients: `internalClient` talks to S3_ENDPOINT (reachable from the API
 * container), `signingClient` is bound to S3_PUBLIC_URL so presigned URLs are
 * signed for the host the browser will actually hit — the SDK includes `host`
 * in the SigV4 signed headers, so we can't just string-replace it afterwards.
 * When the two URLs match (the default), it's the same client instance.
 */
@Injectable()
export class S3StorageProvider implements StorageProvider {
  private readonly logger = new Logger(S3StorageProvider.name);
  private readonly internalClient: S3Client;
  private readonly signingClient: S3Client;
  private readonly bucket: string;
  private readonly uploadTtl: number;
  private readonly downloadTtl: number;

  constructor(private readonly config: ConfigService<AppConfig, true>) {
    this.bucket = this.config.get('S3_BUCKET', { infer: true });
    this.uploadTtl = this.config.get('UPLOAD_URL_TTL', { infer: true });
    this.downloadTtl = this.config.get('DOWNLOAD_URL_TTL', { infer: true });

    const region = this.config.get('S3_REGION', { infer: true });
    const forcePathStyle = this.config.get('S3_FORCE_PATH_STYLE', { infer: true });
    const credentials = {
      accessKeyId: this.config.get('S3_ACCESS_KEY_ID', { infer: true }),
      secretAccessKey: this.config.get('S3_SECRET_ACCESS_KEY', { infer: true }),
    };
    const endpoint = this.config.get('S3_ENDPOINT', { infer: true }) || undefined;
    const publicUrl = this.config.get('S3_PUBLIC_URL', { infer: true }) || endpoint;

    this.internalClient = new S3Client({ region, endpoint, forcePathStyle, credentials });
    this.signingClient =
      publicUrl && publicUrl !== endpoint
        ? new S3Client({ region, endpoint: publicUrl, forcePathStyle, credentials })
        : this.internalClient;
  }

  async createUploadUrl(params: {
    key: string;
    contentType: string;
    maxBytes?: number;
    expiresIn?: number;
  }): Promise<PresignedUpload> {
    const expiresIn = params.expiresIn ?? this.uploadTtl;
    // Content-Type is signed so the stored object keeps the right MIME and the
    // client can't swap it. Content-Length isn't signed (keeps the browser PUT
    // simple); MAX_UPLOAD_BYTES is enforced when the ticket is issued.
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: params.key,
      ContentType: params.contentType,
    });
    const url = await getSignedUrl(this.signingClient, command, { expiresIn });
    return { url, requiredHeaders: { 'Content-Type': params.contentType }, expiresIn };
  }

  async createDownloadUrl(params: {
    key: string;
    expiresIn?: number;
    downloadFilename?: string;
  }): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: params.key,
      ResponseContentDisposition: params.downloadFilename
        ? `attachment; filename="${encodeURIComponent(params.downloadFilename)}"`
        : undefined,
    });
    return getSignedUrl(this.signingClient, command, {
      expiresIn: params.expiresIn ?? this.downloadTtl,
    });
  }

  async putObject(params: {
    key: string;
    body: Buffer | Readable;
    contentType: string;
  }): Promise<void> {
    if (Buffer.isBuffer(params.body)) {
      await this.internalClient.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: params.key,
          Body: params.body,
          ContentType: params.contentType,
        }),
      );
      return;
    }
    // Stream of unknown length (e.g. a ZIP being assembled) — multipart upload.
    await new Upload({
      client: this.internalClient,
      params: {
        Bucket: this.bucket,
        Key: params.key,
        Body: params.body,
        ContentType: params.contentType,
      },
    }).done();
  }

  async getObjectStream(key: string): Promise<Readable> {
    const res = await this.internalClient.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    return res.Body as Readable;
  }

  async objectExists(key: string): Promise<boolean> {
    try {
      await this.internalClient.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return true;
    } catch (err: any) {
      if (err?.$metadata?.httpStatusCode === 404 || err?.name === 'NotFound') return false;
      throw err;
    }
  }

  async deleteObjects(keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    // S3 DeleteObjects caps at 1000 keys per call.
    for (let i = 0; i < keys.length; i += 1000) {
      const batch = keys.slice(i, i + 1000);
      await this.internalClient.send(
        new DeleteObjectsCommand({
          Bucket: this.bucket,
          Delete: { Objects: batch.map((Key) => ({ Key })), Quiet: true },
        }),
      );
    }
  }
}
