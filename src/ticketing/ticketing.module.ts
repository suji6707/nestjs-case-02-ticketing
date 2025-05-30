import { Module } from '@nestjs/common';
import { EventSearchController } from './controllers/event-search.controller';
import { ReservationController } from './controllers/reservation.controller';
import { ConcertRepository } from './repositories/concert.repository';
import { EventSearchService } from './services/event-search.service';
import { ReservationService } from './services/reservation.service';

@Module({
	providers: [EventSearchService, ReservationService, ConcertRepository],
	controllers: [EventSearchController, ReservationController],
})
export class TicketingModule {}
