import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { loadConfiguration } from './config/configuration';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { StorageModule } from './storage/storage.module';
import { PublicAccessModule } from './public/public-access.module';
import { AuthModule } from './auth/auth.module';
import { EventsModule } from './events/events.module';
import { GuestModule } from './guest/guest.module';
import { MediaModule } from './media/media.module';
import { GalleryModule } from './gallery/gallery.module';
import { ExportModule } from './export/export.module';
import { CleanupModule } from './cleanup/cleanup.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      // apps/api/.env wins, repo-root .env is the shared fallback.
      envFilePath: ['.env', '../../.env'],
      // `validate` (not `load`) so the zod-coerced, typed values replace the
      // raw string env in ConfigService.
      validate: loadConfiguration,
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    StorageModule,
    PublicAccessModule,
    AuthModule,
    EventsModule,
    GuestModule,
    MediaModule,
    GalleryModule,
    ExportModule,
    CleanupModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
