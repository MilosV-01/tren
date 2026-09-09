import { Module } from '@nestjs/common';
import { EventsModule } from '../events/events.module';
import { GuestService } from './guest.service';
import { GuestController } from './guest.controller';

@Module({
  imports: [EventsModule],
  providers: [GuestService],
  controllers: [GuestController],
})
export class GuestModule {}
