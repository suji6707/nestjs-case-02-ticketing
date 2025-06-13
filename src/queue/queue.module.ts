import { Module } from '@nestjs/common';
import { QueueConsumer } from './services/queue-consumer.service';

@Module({
	providers: [QueueConsumer],
})
export class QueueModule {}
