import { Module } from '@nestjs/common';
import { QueueProducer } from './services/queue.producer.service';

@Module({
	providers: [QueueProducer],
	exports: [QueueProducer],
})
export class QueueModule {}
