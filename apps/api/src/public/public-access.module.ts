import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../config/configuration';
import { GalleryAccessService } from './gallery-access.service';
import { GuestContextService } from './guest-context.service';

/**
 * Shared building blocks for the unauthenticated guest/gallery surface:
 * gallery access tokens (PIN gate) and guest-session resolution.
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
  providers: [GalleryAccessService, GuestContextService],
  exports: [GalleryAccessService, GuestContextService],
})
export class PublicAccessModule {}
