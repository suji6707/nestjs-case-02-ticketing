import { Inject, Injectable } from '@nestjs/common';
import { IEventBus } from 'src/common/interfaces/ievent-bus.interface';
import { EVENT_BUS } from 'src/common/utils/constants';
import { Reservation } from '../domain/models/reservation';
import {
	ReservationFailureData,
	ReservationFailureKafkaEvent,
	ReservationSuccessKafkaEvent,
} from './reservation-event';

@Injectable()
export class ReservationEventPublisher {
	constructor(
		@Inject(EVENT_BUS)
		private readonly eventBus: IEventBus,
	) {}

	publishReservationSuccess(data: Reservation): void {
		const event = new ReservationSuccessKafkaEvent(data);
		this.eventBus.publish(event);
	}

	publishReservationFailure(data: ReservationFailureData): void {
		const event = new ReservationFailureKafkaEvent(data);
		this.eventBus.publish(event);
	}
}
