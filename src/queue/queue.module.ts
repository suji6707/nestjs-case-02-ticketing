import { Module } from '@nestjs/common';
import { TicketingModule } from 'src/ticketing/ticketing.module';
import { QueueConsumer } from './services/queue-consumer.service';
import { ReservationExpireConsumer } from './services/reservation-expire-consumer.service';

@Module({
	imports: [TicketingModule],
	providers: [QueueConsumer, ReservationExpireConsumer],
	exports: [ReservationExpireConsumer],
})
export class QueueModule {}
