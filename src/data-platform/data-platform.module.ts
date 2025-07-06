import { Module } from '@nestjs/common';
import { DataPlatformService } from './services/data-platform.service';

@Module({
	providers: [DataPlatformService],
	exports: [DataPlatformService],
})
export class DataPlatformModule {}
