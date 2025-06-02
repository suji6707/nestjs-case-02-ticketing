import { Module } from '@nestjs/common';
import { EventSearchService } from './application/services/event-search.service';
import { ReservationService } from './application/services/reservation.service';
import { TokenService } from './application/services/token.service';
import { EventSearchController } from './controllers/event-search.controller';
import { ReservationController } from './controllers/reservation.controller';
import { ConcertPrismaRepository } from './infrastructure/persistence/concert.prisma.repository';

@Module({
	providers: [
		EventSearchService,
		ReservationService,
		TokenService,
		{ provide: 'IConcertRepository', useClass: ConcertPrismaRepository },
	],
	controllers: [EventSearchController, ReservationController],
})
export class TicketingModule {}
