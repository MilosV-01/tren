import { z } from 'zod';

/**
 * Central enum definitions. Kept as plain const arrays + zod enums so the exact
 * same string unions are used by Prisma (schema.prisma mirrors these), the API
 * validation layer, and the web UI.
 */

export const ORGANIZATION_TYPES = ['individual', 'venue', 'photographer', 'planner'] as const;
export const organizationTypeSchema = z.enum(ORGANIZATION_TYPES);
export type OrganizationType = z.infer<typeof organizationTypeSchema>;

export const EVENT_TYPES = ['wedding', 'birthday', 'corporate', 'other'] as const;
export const eventTypeSchema = z.enum(EVENT_TYPES);
export type EventType = z.infer<typeof eventTypeSchema>;

export const EVENT_VISIBILITIES = ['public', 'pin_protected'] as const;
export const eventVisibilitySchema = z.enum(EVENT_VISIBILITIES);
export type EventVisibility = z.infer<typeof eventVisibilitySchema>;

export const PACKAGE_TIERS = ['free', 'premium'] as const;
export const packageTierSchema = z.enum(PACKAGE_TIERS);
export type PackageTier = z.infer<typeof packageTierSchema>;

export const MEDIA_TYPES = ['photo', 'video'] as const;
export const mediaTypeSchema = z.enum(MEDIA_TYPES);
export type MediaType = z.infer<typeof mediaTypeSchema>;

export const MEDIA_STATUSES = ['uploading', 'processing', 'ready', 'failed'] as const;
export const mediaStatusSchema = z.enum(MEDIA_STATUSES);
export type MediaStatus = z.infer<typeof mediaStatusSchema>;

export const EXPORT_STATUSES = ['pending', 'processing', 'ready', 'failed'] as const;
export const exportStatusSchema = z.enum(EXPORT_STATUSES);
export type ExportStatus = z.infer<typeof exportStatusSchema>;

/** Retention days per package tier. Mirrors RETENTION_* env defaults. */
export const RETENTION_DAYS: Record<PackageTier, number> = {
  free: 7,
  premium: 90,
};
