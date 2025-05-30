import { Module } from '@nestjs/common';
import { QueueService } from './services/queue.service';
import { QueueController } from './controllers/queue.controller';

@Module({
	providers: [QueueService],
	controllers: [QueueController],
})
export class QueueModule {}
