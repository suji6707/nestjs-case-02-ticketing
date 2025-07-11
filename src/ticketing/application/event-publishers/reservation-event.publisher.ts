import { Inject, Injectable } from '@nestjs/common';
import { IEventBus } from 'src/common/interfaces/ievent-bus.interface';
import { EVENT_BUS } from 'src/common/utils/constants';
import {
	PaymentCancelData,
	PaymentCancelEvent,
} from 'src/payment/application/event-publishers/payment.event';
import { Reservation } from '../domain/models/reservation';
import { ReservationSuccessEvent } from './reservation-event';

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

	publishPaymentCancel(data: PaymentCancelData): void {
		const event = new PaymentCancelEvent(data);
		this.eventBus.publish(event);
	}
}
