import { Module } from '@nestjs/common';
import { EventSearchService } from './application/services/event-search.service';
import { PaymentTokenService } from './application/services/payment-token.service';
import { QueueTokenService } from './application/services/queue-token.service';
import { ReservationService } from './application/services/reservation.service';
import { EventSearchController } from './controllers/event-search.controller';
import { ReservationController } from './controllers/reservation.controller';
import { ConcertPrismaRepository } from './infrastructure/persistence/concert.prisma.repository';

@Module({
	providers: [
		EventSearchService,
		ReservationService,
		{ provide: 'QueueTokenService', useClass: QueueTokenService },
		{ provide: 'PaymentTokenService', useClass: PaymentTokenService },
		{ provide: 'IConcertRepository', useClass: ConcertPrismaRepository },
	],
	controllers: [EventSearchController, ReservationController],
})
export class TicketingModule {}
