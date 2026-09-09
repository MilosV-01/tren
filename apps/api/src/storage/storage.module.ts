import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../config/configuration';
import { STORAGE_PROVIDER } from './storage-provider.interface';
import { S3StorageProvider } from './s3-storage.provider';
import { LocalDiskStorageProvider } from './local-disk-storage.provider';
import { BlobController } from './blob.controller';

/**
 * The rest of the app injects `@Inject(STORAGE_PROVIDER)` and depends only on
 * the StorageProvider interface. STORAGE_DRIVER picks the implementation:
 *   - "s3":   S3StorageProvider (AWS S3 / Cloudflare R2 / MinIO), direct upload
 *   - "disk": LocalDiskStorageProvider, bytes flow through /api/blob
 */
@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) => ({
        secret: config.get('JWT_SECRET', { infer: true }),
      }),
    }),
  ],
  providers: [
    S3StorageProvider,
    LocalDiskStorageProvider,
    {
      provide: STORAGE_PROVIDER,
      inject: [ConfigService, S3StorageProvider, LocalDiskStorageProvider],
      useFactory: (
        config: ConfigService<AppConfig, true>,
        s3: S3StorageProvider,
        disk: LocalDiskStorageProvider,
      ) => (config.get('STORAGE_DRIVER', { infer: true }) === 'disk' ? disk : s3),
    },
  ],
  controllers: [BlobController],
  exports: [STORAGE_PROVIDER],
})
export class StorageModule {}
