import { Module } from '@nestjs/common';
import { EventsModule } from '../events/events.module';
import { ExportService } from './export.service';
import { ExportProcessor } from './export.processor';
import { ExportController } from './export.controller';

@Module({
  imports: [EventsModule],
  providers: [ExportService, ExportProcessor],
  controllers: [ExportController],
})
export class ExportModule {}
