import { Inject, Injectable } from '@nestjs/common';
import { IEventBus } from 'src/common/interfaces/ievent-bus.interface';
import { EVENT_BUS } from 'src/common/utils/constants';
import { PaymentSuccessEvent } from './payment.event';

@Injectable()
export class PaymentEventPublisher {
	constructor(
		@Inject(EVENT_BUS)
		private readonly eventBus: IEventBus,
	) {}

	async publishPaymentSuccess(reservationId: number): Promise<void> {
		const event = new PaymentSuccessEvent({ reservationId });
		this.eventBus.publish(event);
	}
}
