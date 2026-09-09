import { CleanupService } from './cleanup.service';

describe('CleanupService.purgeExpiredMedia', () => {
  function makeService() {
    const expiredEvents = [{ id: 'evt_old' }];
    const media = [
      { id: 'm1', storageKey: 'events/evt_old/media/a.jpg', thumbnailKey: null },
      { id: 'm2', storageKey: 'events/evt_old/media/b.mp4', thumbnailKey: 'events/evt_old/thumbs/b.jpg' },
    ];
    const exportsRows = [{ id: 'x1', storageKey: 'events/evt_old/exports/x1.zip' }];

    const prisma = {
      event: { findMany: jest.fn(async () => expiredEvents) },
      mediaItem: {
        findMany: jest.fn(async () => media),
        deleteMany: jest.fn(async () => ({ count: media.length })),
      },
      galleryExport: {
        findMany: jest.fn(async () => exportsRows),
        deleteMany: jest.fn(async () => ({ count: exportsRows.length })),
      },
      $transaction: jest.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
    };
    const config = { get: () => false };
    const storage = { deleteObjects: jest.fn(async () => undefined) };
    const service = new CleanupService(prisma as any, config as any, storage as any);
    return { service, prisma, storage };
  }

  it('deletes storage objects + rows for events past expiresAt', async () => {
    const { service, prisma, storage } = makeService();
    const summary = await service.purgeExpiredMedia(new Date('2026-09-08T00:00:00Z'));

    expect(prisma.event.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { expiresAt: { lt: new Date('2026-09-08T00:00:00Z') } },
      }),
    );
    expect(storage.deleteObjects).toHaveBeenCalledWith([
      'events/evt_old/media/a.jpg',
      'events/evt_old/media/b.mp4',
      'events/evt_old/thumbs/b.jpg',
      'events/evt_old/exports/x1.zip',
    ]);
    expect(summary).toEqual({
      events: 1,
      deletedMedia: 2,
      deletedObjects: 4,
      deletedExports: 1,
    });
  });

  it('is a no-op when nothing has expired', async () => {
    const { service, prisma, storage } = makeService();
    prisma.event.findMany.mockResolvedValueOnce([]);
    const summary = await service.purgeExpiredMedia();
    expect(storage.deleteObjects).not.toHaveBeenCalled();
    expect(summary).toEqual({ events: 0, deletedMedia: 0, deletedObjects: 0, deletedExports: 0 });
  });
});
