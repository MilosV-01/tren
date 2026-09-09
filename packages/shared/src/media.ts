import { z } from 'zod';
import type { MediaType, MediaStatus } from './enums';

/** Image + video MIME types the guest page is allowed to upload. */
export const ALLOWED_IMAGE_MIME = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'image/gif',
] as const;
export const ALLOWED_VIDEO_MIME = [
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/x-matroska',
  'video/3gpp',
] as const;
export const ALLOWED_MIME = [...ALLOWED_IMAGE_MIME, ...ALLOWED_VIDEO_MIME] as const;

export function mimeToMediaType(mime: string): MediaType | null {
  if ((ALLOWED_IMAGE_MIME as readonly string[]).includes(mime)) return 'photo';
  if ((ALLOWED_VIDEO_MIME as readonly string[]).includes(mime)) return 'video';
  return null;
}

/**
 * Step 1 of the presigned-upload flow: client asks for a URL. Server validates,
 * creates a MediaItem row (status = uploading) and returns where to PUT the bytes.
 */
export const uploadUrlRequestSchema = z.object({
  filename: z.string().trim().min(1).max(255),
  contentType: z.string().refine((m) => (ALLOWED_MIME as readonly string[]).includes(m), {
    message: 'Nepodržan tip fajla',
  }),
  sizeBytes: z.coerce.number().int().positive(),
});
export type UploadUrlRequest = z.infer<typeof uploadUrlRequestSchema>;

export interface UploadTicketDto {
  /** MediaItem id created in `uploading` state; echo it back on confirm. */
  mediaId: string;
  /** Object key inside the bucket the bytes must be PUT to. */
  storageKey: string;
  /** Presigned URL — issue an HTTP PUT with the raw file body. */
  uploadUrl: string;
  /** Headers that must be sent with the PUT for the signature to match. */
  requiredHeaders: Record<string, string>;
  /** Seconds until `uploadUrl` expires. */
  expiresIn: number;
}

/** Step 2: client tells the server the bytes landed. */
export const confirmUploadSchema = z.object({
  mediaId: z.string().min(1),
});
export type ConfirmUploadInput = z.infer<typeof confirmUploadSchema>;

export interface MediaItemDto {
  id: string;
  type: MediaType;
  status: MediaStatus;
  /** Short-lived presigned GET URL for the full asset. */
  url: string;
  /** Presigned GET URL for the thumbnail, or `url` when no thumbnail exists yet. */
  thumbnailUrl: string;
  guestName: string;
  createdAt: string;
}
