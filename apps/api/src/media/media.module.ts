import { Module } from '@nestjs/common';
import { EventsModule } from '../events/events.module';
import { MediaService } from './media.service';
import { MediaController } from './media.controller';
import { OrganizerMediaController } from './organizer-media.controller';

@Module({
  imports: [EventsModule],
  providers: [MediaService],
  controllers: [MediaController, OrganizerMediaController],
  exports: [MediaService],
})
export class MediaModule {}
