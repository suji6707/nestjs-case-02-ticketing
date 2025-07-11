import { Module, forwardRef } from '@nestjs/common';
import { DataPlatformModule } from 'src/data-platform/data-platform.module';
import { PaymentModule } from '../payment/payment.module';
import { ReservationEventPublisher } from './application/event-publishers/reservation-event.publisher';
import { EventSearchService } from './application/services/event-search.service';
import { PaymentTokenService } from './application/services/payment-token.service';
import { QueueRankingService } from './application/services/queue-ranking.service';
import { QueueTokenService } from './application/services/queue-token.service';
import { ReservationService } from './application/services/reservation.service';
import { SeatLockService } from './application/services/seat-lock.service';
import { SelloutRankingService } from './application/services/sellout-ranking.service';
import { EventSearchController } from './controllers/event-search.controller';
import { RankingController } from './controllers/ranking.controller';
import { ReservationController } from './controllers/reservation.controller';
import { ReservationEventListener } from './infrastructure/event-listeners/reservation-event.listener';
import { QueueProducer } from './infrastructure/external/queue-producer.service';
import { ConcertPrismaRepository } from './infrastructure/persistence/concert.prisma.repository';
import { ReservationPrismaRepository } from './infrastructure/persistence/reservation.prisma.repository';
import { SeatPrismaRepository } from './infrastructure/persistence/seat.prisma.repository';

@Module({
	imports: [forwardRef(() => PaymentModule), DataPlatformModule],
	providers: [
		EventSearchService,
		ReservationService,
		SeatLockService,
		SelloutRankingService,
		QueueRankingService,
		{ provide: 'QueueTokenService', useClass: QueueTokenService },
		{ provide: 'PaymentTokenService', useClass: PaymentTokenService },
		{ provide: 'IConcertRepository', useClass: ConcertPrismaRepository },
		{ provide: 'ISeatRepository', useClass: SeatPrismaRepository },
		{
			provide: 'IReservationRepository',
			useClass: ReservationPrismaRepository,
		},
		QueueProducer,
		ReservationEventPublisher,
		ReservationEventListener,
	],
	controllers: [
		EventSearchController,
		ReservationController,
		RankingController,
	],
	exports: [
		SeatLockService,
		ReservationService,
		{ provide: 'PaymentTokenService', useClass: PaymentTokenService },
		{
			provide: 'IReservationRepository',
			useClass: ReservationPrismaRepository,
		},
		{
			provide: 'ISeatRepository',
			useClass: SeatPrismaRepository,
		},
	],
})
export class TicketingModule {}
