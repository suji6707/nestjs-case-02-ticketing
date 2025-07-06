import { Inject, Injectable } from '@nestjs/common';
import { IEventBus } from 'src/common/interfaces/ievent-bus.interface';
import { EVENT_BUS } from 'src/common/utils/constants';
import {
	PaymentFailedData,
	PaymentFailedEvent,
	PaymentSuccessData,
	PaymentSuccessEvent,
} from './payment.event';

@Injectable()
export class PaymentEventPublisher {
	constructor(
		@Inject(EVENT_BUS)
		private readonly eventBus: IEventBus,
	) {}

	async publishPaymentSuccess(data: PaymentSuccessData): Promise<void> {
		const event = new PaymentSuccessEvent(data);
		this.eventBus.publish(event);
	}

	async publishPaymentFailed(data: PaymentFailedData): Promise<void> {
		const event = new PaymentFailedEvent(data);
		this.eventBus.publish(event);
	}
}
