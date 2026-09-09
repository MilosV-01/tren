import { Module } from '@nestjs/common';
import { EventsModule } from '../events/events.module';
import { MediaModule } from '../media/media.module';
import { GalleryService } from './gallery.service';
import { GalleryController } from './gallery.controller';

@Module({
  imports: [EventsModule, MediaModule],
  providers: [GalleryService],
  controllers: [GalleryController],
})
export class GalleryModule {}
