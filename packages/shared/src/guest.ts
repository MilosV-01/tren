import { z } from 'zod';

/**
 * Guests never authenticate. They "join" an event once with a display name and
 * get back an opaque sessionToken which the web app stores in localStorage and
 * sends on every subsequent upload as the `x-guest-session` header.
 */
export const joinEventSchema = z.object({
  displayName: z.string().trim().min(1).max(60),
});
export type JoinEventInput = z.infer<typeof joinEventSchema>;

export interface GuestSessionDto {
  guestId: string;
  sessionToken: string;
  displayName: string;
  eventSlug: string;
}

/** Header name carrying the guest sessionToken. */
export const GUEST_SESSION_HEADER = 'x-guest-session';
