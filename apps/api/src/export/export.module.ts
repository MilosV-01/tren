import { Module } from '@nestjs/common';
import { EventsModule } from '../events/events.module';
import { ExportService } from './export.service';
import { ExportProcessor } from './export.processor';
import { ExportController } from './export.controller';
import { OrganizerExportController } from './organizer-export.controller';

@Module({
  imports: [EventsModule],
  providers: [ExportService, ExportProcessor],
  controllers: [ExportController, OrganizerExportController],
})
export class ExportModule {}
