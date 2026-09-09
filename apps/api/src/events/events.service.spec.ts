import * as bcrypt from 'bcryptjs';
import { EventsService } from './events.service';

/** Minimal fakes — these tests only exercise create()'s derived fields. */
function makeService() {
  const created: any[] = [];
  const prisma = {
    event: {
      create: jest.fn(async ({ data }: any) => {
        const row = {
          id: `evt_${created.length + 1}`,
          createdAt: new Date('2026-09-08T10:00:00Z'),
          updatedAt: new Date('2026-09-08T10:00:00Z'),
          pinHash: null,
          ...data,
        };
        created.push(row);
        return row;
      }),
    },
  };
  const config = {
    get: (key: string) => {
      const values: Record<string, unknown> = {
        RETENTION_FREE_DAYS: 7,
        RETENTION_PREMIUM_DAYS: 90,
        WEB_ORIGIN: 'http://localhost:3000',
      };
      return values[key];
    },
  };
  const service = new EventsService(prisma as any, config as any);
  return { service, prisma, created };
}

describe('EventsService.create', () => {
  it('generates a slug from the title plus a random suffix', async () => {
    const { service } = makeService();
    const dto = {
      title: 'Ana i Marko',
      eventDate: new Date('2026-10-01T18:00:00Z'),
      eventType: 'wedding' as const,
      packageTier: 'free' as const,
      visibility: 'public' as const,
    };
    const event = await service.create('org_1', dto);
    expect(event.gallerySlug).toMatch(/^ana-i-marko-[0-9a-z]{6}$/);
    expect(event.shareUrl).toBe(`http://localhost:3000/e/${event.gallerySlug}`);
  });

  it('derives retentionDays + expiresAt from the Free package tier', async () => {
    const { service } = makeService();
    const event = await service.create('org_1', {
      title: 'Rođendan',
      eventDate: new Date('2026-10-01T18:00:00Z'),
      eventType: 'birthday',
      packageTier: 'free',
      visibility: 'public',
    });
    expect(event.retentionDays).toBe(7);
    // expiry is anchored to creation wall-clock; ~7 days ahead of "now".
    const daysAhead = (Date.parse(event.expiresAt) - Date.now()) / (24 * 60 * 60 * 1000);
    expect(daysAhead).toBeGreaterThan(6.9);
    expect(daysAhead).toBeLessThan(7.1);
  });

  it('uses 90 days for the Premium tier', async () => {
    const { service } = makeService();
    const event = await service.create('org_1', {
      title: 'Firma',
      eventDate: new Date('2026-10-01T18:00:00Z'),
      eventType: 'corporate',
      packageTier: 'premium',
      visibility: 'public',
    });
    expect(event.retentionDays).toBe(90);
  });

  it('stores a bcrypt hash of the PIN for a pin_protected gallery', async () => {
    const { service, created } = makeService();
    const event = await service.create('org_1', {
      title: 'Tajna',
      eventDate: new Date('2026-10-01T18:00:00Z'),
      eventType: 'other',
      packageTier: 'free',
      visibility: 'pin_protected',
      pin: '4821',
    });
    expect(event.hasPin).toBe(true);
    const stored = created[0].pinHash as string;
    expect(stored).not.toBe('4821');
    expect(await bcrypt.compare('4821', stored)).toBe(true);
  });
});
