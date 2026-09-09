import { z } from 'zod';
import { type ExportStatus } from './enums';

/** PIN verification for the guest gallery gate. */
export const verifyPinSchema = z.object({
  pin: z.string().regex(/^\d{4,8}$/),
});
export type VerifyPinInput = z.infer<typeof verifyPinSchema>;

export interface VerifyPinResultDto {
  /** Signed token proving the PIN was cleared; send as `x-gallery-access` header. */
  accessToken: string;
  expiresIn: number;
}

/** Header carrying the gallery access token issued after a successful PIN check. */
export const GALLERY_ACCESS_HEADER = 'x-gallery-access';

export interface ExportJobDto {
  id: string;
  status: ExportStatus;
  /** 0..100, best-effort. */
  progress: number;
  /** Presigned download URL for the finished ZIP; null until status = ready. */
  downloadUrl: string | null;
  fileCount: number;
  createdAt: string;
  completedAt: string | null;
  error: string | null;
}
