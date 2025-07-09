import { Inject, Injectable } from '@nestjs/common';
import { IEventBus } from 'src/common/interfaces/ievent-bus.interface';
import { EVENT_BUS } from 'src/common/utils/constants';
import { Reservation } from '../domain/models/reservation';
import {
	ReservationFailedData,
	ReservationFailedEvent,
	ReservationSuccessEvent,
} from './reservation-event';

@Injectable()
export class ReservationEventPublisher {
	constructor(
		@Inject(EVENT_BUS)
		private readonly eventBus: IEventBus,
	) {}

	publishReservationSuccess(data: Reservation): void {
		const event = new ReservationSuccessEvent(data);
		this.eventBus.publish(event);
	}

	publishReservationFailed(data: ReservationFailedData): void {
		const event = new ReservationFailedEvent(data);
		this.eventBus.publish(event);
	}
}
