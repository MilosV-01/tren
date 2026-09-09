import { z } from 'zod';
import { organizationTypeSchema } from './enums';

/**
 * Organizer auth. Phase 1 uses email + password (see README for why over magic
 * link). `magicLinkToken` exists in the DB model so magic link can be added
 * later without a breaking migration.
 */

export const registerSchema = z.object({
  organizationName: z.string().trim().min(2).max(120),
  organizationType: organizationTypeSchema.default('individual'),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(200),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(200),
});
export type LoginInput = z.infer<typeof loginSchema>;

export interface AuthUserDto {
  id: string;
  email: string;
  organizationId: string;
  organizationName: string;
}

export interface AuthResultDto {
  token: string;
  user: AuthUserDto;
}
