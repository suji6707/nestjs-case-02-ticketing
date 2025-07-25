import { Module } from '@nestjs/common';
import { TicketingModule } from 'src/ticketing/ticketing.module';
import { QueueConsumer } from './services/queue-consumer.service';
import { ReservationExpireConsumer } from './services/reservation-expire-consumer.service';
import { QueueBatchService } from './services/queue-batch.service';
import { QueueSchedulerService } from './services/queue-scheduler.service';

@Module({
	imports: [TicketingModule],
	providers: [QueueConsumer, ReservationExpireConsumer, QueueBatchService, QueueSchedulerService],
	exports: [ReservationExpireConsumer],
})
export class QueueModule {}
