import { Module } from '@nestjs/common';
import { DataPlatformService } from './application/services/data-platform.service';
import { EventLogPrismaRepository } from './infrastructure/persistence/event-log.repository';

@Module({
	providers: [DataPlatformService, EventLogPrismaRepository],
	exports: [DataPlatformService, EventLogPrismaRepository],
})
export class DataPlatformModule {}
