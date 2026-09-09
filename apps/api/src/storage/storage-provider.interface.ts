import { Readable } from 'node:stream';

export const STORAGE_PROVIDER = Symbol('STORAGE_PROVIDER');

export interface PresignedUpload {
  url: string;
  /** Headers the client MUST replay on the PUT for the signature to validate. */
  requiredHeaders: Record<string, string>;
  expiresIn: number;
}

/**
 * Everything the app needs from object storage, provider-agnostic. The only
 * implementation in Phase 1 is S3StorageProvider (works against AWS S3,
 * Cloudflare R2 and MinIO). Swap the binding in storage.module.ts to change
 * providers — nothing else in the codebase imports the SDK.
 */
export interface StorageProvider {
  /** Presigned PUT URL for a direct browser upload. */
  createUploadUrl(params: {
    key: string;
    contentType: string;
    maxBytes?: number;
    expiresIn?: number;
  }): Promise<PresignedUpload>;

  /** Short-lived presigned GET URL for displaying / downloading an object. */
  createDownloadUrl(params: {
    key: string;
    expiresIn?: number;
    /** Sets response-content-disposition=attachment; filename="...". */
    downloadFilename?: string;
  }): Promise<string>;

  /** Server-side upload (used to store generated ZIP exports). */
  putObject(params: { key: string; body: Buffer | Readable; contentType: string }): Promise<void>;

  /** Read an object as a stream (used to assemble ZIP exports). */
  getObjectStream(key: string): Promise<Readable>;

  objectExists(key: string): Promise<boolean>;

  /** Best-effort bulk delete (used by the future retention cleanup job). */
  deleteObjects(keys: string[]): Promise<void>;
}
