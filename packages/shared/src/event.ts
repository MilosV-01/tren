import { z } from 'zod';
import {
  eventTypeSchema,
  eventVisibilitySchema,
  packageTierSchema,
  type EventType,
  type EventVisibility,
  type PackageTier,
} from './enums';
import { pinSchema } from './common';

/**
 * Event creation. `visibility` + `pin` are coupled: a pin_protected event must
 * carry a PIN, a public one must not. The refinement enforces that pair so the
 * API never has to guess.
 */
export const createEventSchema = z
  .object({
    title: z.string().trim().min(2).max(160),
    eventDate: z.coerce.date(),
    eventType: eventTypeSchema,
    packageTier: packageTierSchema.default('free'),
    visibility: eventVisibilitySchema.default('public'),
    pin: pinSchema.optional(),
  })
  .refine((v) => v.visibility === 'pin_protected' || !v.pin, {
    message: 'PIN se zadaje samo kad je galerija PIN zaštićena',
    path: ['pin'],
  })
  .refine((v) => v.visibility !== 'pin_protected' || !!v.pin, {
    message: 'PIN zaštićena galerija zahteva PIN',
    path: ['pin'],
  });
export type CreateEventInput = z.infer<typeof createEventSchema>;

/** All fields optional; same visibility/pin coupling rules applied server-side. */
export const updateEventSchema = z.object({
  title: z.string().trim().min(2).max(160).optional(),
  eventDate: z.coerce.date().optional(),
  eventType: eventTypeSchema.optional(),
  packageTier: packageTierSchema.optional(),
  visibility: eventVisibilitySchema.optional(),
  pin: pinSchema.nullable().optional(),
});
export type UpdateEventInput = z.infer<typeof updateEventSchema>;

export interface EventDto {
  id: string;
  title: string;
  eventDate: string; // ISO
  eventType: EventType;
  gallerySlug: string;
  visibility: EventVisibility;
  hasPin: boolean;
  packageTier: PackageTier;
  retentionDays: number;
  /** ISO datetime after which media is eligible for deletion. */
  expiresAt: string;
  createdAt: string;
  /** Absolute guest URL, e.g. https://app.tren.rs/e/ana-i-marko-4f2c9. */
  shareUrl: string;
}

export interface EventStatsDto {
  mediaCount: number;
  photoCount: number;
  videoCount: number;
  guestCount: number;
  lastUploadAt: string | null;
}

export interface EventWithStatsDto extends EventDto {
  stats: EventStatsDto;
}

/** Public, unauthenticated view of an event for the guest upload + gallery pages. */
export interface PublicEventDto {
  title: string;
  eventDate: string;
  eventType: EventType;
  gallerySlug: string;
  visibility: EventVisibility;
  /** True once the caller has cleared the PIN gate (or the gallery is public). */
  unlocked: boolean;
  isExpired: boolean;
  /** Aggregate counts only — never exposed alongside actual media until unlocked. */
  guestCount: number;
  mediaCount: number;
}
