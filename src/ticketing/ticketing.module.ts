import { Module } from '@nestjs/common';
import { QueueModule } from 'src/queue/queue.module';
import { PaymentModule } from '../payment/payment.module';
import { EventSearchService } from './application/services/event-search.service';
import { PaymentTokenService } from './application/services/payment-token.service';
import { QueueTokenService } from './application/services/queue-token.service';
import { ReservationService } from './application/services/reservation.service';
import { SeatLockService } from './application/services/seat-lock.service';
import { EventSearchController } from './controllers/event-search.controller';
import { ReservationController } from './controllers/reservation.controller';
import { ConcertPrismaRepository } from './infrastructure/persistence/concert.prisma.repository';
import { ReservationPrismaRepository } from './infrastructure/persistence/reservation.prisma.repository';
import { SeatPrismaRepository } from './infrastructure/persistence/seat.prisma.repository';

@Module({
	imports: [PaymentModule, QueueModule],
	providers: [
		EventSearchService,
		ReservationService,
		SeatLockService,
		{ provide: 'QueueTokenService', useClass: QueueTokenService },
		{ provide: 'PaymentTokenService', useClass: PaymentTokenService },
		{ provide: 'IConcertRepository', useClass: ConcertPrismaRepository },
		{ provide: 'ISeatRepository', useClass: SeatPrismaRepository },
		{
			provide: 'IReservationRepository',
			useClass: ReservationPrismaRepository,
		},
	],
	controllers: [EventSearchController, ReservationController],
})
export class TicketingModule {}
