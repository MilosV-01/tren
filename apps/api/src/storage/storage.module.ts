import { Global, Module } from '@nestjs/common';
import { STORAGE_PROVIDER } from './storage-provider.interface';
import { S3StorageProvider } from './s3-storage.provider';

/**
 * The rest of the app injects `@Inject(STORAGE_PROVIDER)` and depends only on
 * the StorageProvider interface. To switch providers, rebind the token here.
 */
@Global()
@Module({
  providers: [{ provide: STORAGE_PROVIDER, useClass: S3StorageProvider }],
  exports: [STORAGE_PROVIDER],
})
export class StorageModule {}
