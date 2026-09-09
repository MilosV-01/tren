/* eslint-disable no-console */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DEMO_EMAIL = 'demo@tren.rs';
const DEMO_PASSWORD = 'demo1234';

function expiry(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

async function main(): Promise<void> {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {},
    create: {
      email: DEMO_EMAIL,
      passwordHash,
      organization: { create: { name: 'Demo organizacija', type: 'individual' } },
    },
    include: { organization: true },
  });

  const orgId = user.organizationId;

  await prisma.event.upsert({
    where: { gallerySlug: 'ana-i-marko-demo01' },
    update: {},
    create: {
      organizationId: orgId,
      title: 'Ana i Marko',
      eventDate: new Date('2026-10-04T17:00:00Z'),
      eventType: 'wedding',
      gallerySlug: 'ana-i-marko-demo01',
      visibility: 'public',
      packageTier: 'premium',
      retentionDays: 90,
      expiresAt: expiry(90),
    },
  });

  await prisma.event.upsert({
    where: { gallerySlug: 'petrov-30-demo02' },
    update: {},
    create: {
      organizationId: orgId,
      title: 'Petrov 30. rođendan',
      eventDate: new Date('2026-09-20T19:00:00Z'),
      eventType: 'birthday',
      gallerySlug: 'petrov-30-demo02',
      visibility: 'pin_protected',
      pinHash: await bcrypt.hash('2468', 10),
      packageTier: 'free',
      retentionDays: 7,
      expiresAt: expiry(7),
    },
  });

  console.log('Seed complete.');
  console.log(`  Organizer login: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  console.log('  Public gallery:  /e/ana-i-marko-demo01');
  console.log('  PIN gallery:     /e/petrov-30-demo02  (PIN 2468)');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
