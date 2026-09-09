import { MediaService } from './media.service';

function makeService(overrides: { maxBytes?: number } = {}) {
  const event = {
    id: 'evt_1',
    gallerySlug: 'ana-i-marko-abc123',
    expiresAt: new Date(Date.now() + 86_400_000),
  };
  const prisma = {
    mediaItem: {
      create: jest.fn(async ({ data }: any) => ({
        id: 'media_1',
        createdAt: new Date('2026-09-08T12:00:00Z'),
        thumbnailKey: null,
        status: 'uploading',
        ...data,
      })),
    },
  };
  const config = {
    get: (key: string) => (key === 'MAX_UPLOAD_BYTES' ? (overrides.maxBytes ?? 200 * 1024 * 1024) : undefined),
  };
  const events = {
    findBySlugOrThrow: jest.fn(async () => event),
    isExpired: jest.fn(() => false),
  };
  const guests = { requireGuest: jest.fn(async () => ({ id: 'guest_1', displayName: 'Pera' })) };
  const galleryAccess = { assertCanAccess: jest.fn() };
  const storage = {
    createUploadUrl: jest.fn(async (p: any) => ({
      url: `https://s3.local/${p.key}?sig=x`,
      requiredHeaders: { 'Content-Type': p.contentType },
      expiresIn: 900,
    })),
    createDownloadUrl: jest.fn(async (p: any) => `https://s3.local/${p.key}?get`),
    objectExists: jest.fn(async () => true),
  };
  const service = new MediaService(
    prisma as any,
    config as any,
    events as any,
    guests as any,
    galleryAccess as any,
    storage as any,
  );
  return { service, prisma, storage, guests };
}

describe('MediaService.issueUploadTicket', () => {
  const req = { header: () => 'guest-token' } as any;

  it('creates an uploading MediaItem and returns a presigned PUT ticket', async () => {
    const { service, prisma, storage } = makeService();
    const ticket = await service.issueUploadTicket('ana-i-marko-abc123', req, {
      filename: 'IMG_1234.JPG',
      contentType: 'image/jpeg',
      sizeBytes: 2_000_000,
    });

    expect(prisma.mediaItem.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventId: 'evt_1',
          guestId: 'guest_1',
          type: 'photo',
          status: 'uploading',
          contentType: 'image/jpeg',
        }),
      }),
    );

    const createdKey = (prisma.mediaItem.create.mock.calls[0][0] as any).data.storageKey as string;
    expect(createdKey).toMatch(/^events\/evt_1\/media\/[\w-]{21}\.jpg$/);

    expect(storage.createUploadUrl).toHaveBeenCalledWith(
      expect.objectContaining({ key: createdKey, contentType: 'image/jpeg' }),
    );
    expect(ticket).toEqual({
      mediaId: 'media_1',
      storageKey: createdKey,
      uploadUrl: `https://s3.local/${createdKey}?sig=x`,
      requiredHeaders: { 'Content-Type': 'image/jpeg' },
      expiresIn: 900,
    });
  });

  it('rejects files larger than MAX_UPLOAD_BYTES', async () => {
    const { service, prisma } = makeService({ maxBytes: 1_000_000 });
    await expect(
      service.issueUploadTicket('ana-i-marko-abc123', req, {
        filename: 'big.mp4',
        contentType: 'video/mp4',
        sizeBytes: 5_000_000,
      }),
    ).rejects.toThrow(/prevelik/i);
    expect(prisma.mediaItem.create).not.toHaveBeenCalled();
  });

  it('maps a video MIME type to type=video', async () => {
    const { service, prisma } = makeService();
    await service.issueUploadTicket('ana-i-marko-abc123', req, {
      filename: 'clip.mov',
      contentType: 'video/quicktime',
      sizeBytes: 10_000_000,
    });
    expect((prisma.mediaItem.create.mock.calls[0][0] as any).data.type).toBe('video');
  });
});
