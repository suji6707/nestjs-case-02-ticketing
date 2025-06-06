import { Module } from '@nestjs/common';
import { QueueConsumer } from './services/queue.consumer.service';
import { QueueProducer } from './services/queue.producer.service';

@Module({
	providers: [QueueProducer, QueueConsumer],
	exports: [QueueProducer],
})
export class QueueModule {}
