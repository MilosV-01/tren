import { z } from 'zod';

/** Cursor-based pagination query, shared by gallery + media listing. */
export const paginationQuerySchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(24),
});
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export interface Paginated<T> {
  items: T[];
  /** Pass back as `cursor` to fetch the next page. `null` when no more items. */
  nextCursor: string | null;
}

export const pinSchema = z
  .string()
  .regex(/^\d{4,8}$/, 'PIN mora imati 4 do 8 cifara');
