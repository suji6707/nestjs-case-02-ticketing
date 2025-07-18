import { Inject, Injectable } from '@nestjs/common';
import { IEventBus } from 'src/common/interfaces/ievent-bus.interface';
import { EVENT_BUS } from 'src/common/utils/constants';
import {
	PaymentCancelKafkaEvent,
	PaymentFailureKafkaEvent,
	PaymentRetryKafkaEvent,
	PaymentSuccessKafkaEvent,
	PaymentTryKafkaEvent,
} from './payment.event';

@Injectable()
export class PaymentEventPublisher {
	constructor(
		@Inject(EVENT_BUS)
		private readonly eventBus: IEventBus,
	) {}

	async publishPaymentTry(
		reservationId: number,
		userId: number,
		seatId: number,
		amount: number,
		paymentTxId: string,
		paymentToken: string,
	): Promise<void> {
		const event = new PaymentTryKafkaEvent({
			reservationId,
			userId,
			seatId,
			amount,
			paymentTxId,
			paymentToken,
		});
		this.eventBus.publish(event);
	}

	publishPaymentSuccess(
		reservationId: number,
		userId: number,
		seatId: number,
		amount: number,
		paymentTxId: string,
	): void {
		const event = new PaymentSuccessKafkaEvent({
			reservationId,
			userId,
			seatId,
			amount,
			paymentTxId,
		});
		this.eventBus.publish(event);
	}

	publishPaymentRetry(
		reservationId: number,
		userId: number,
		seatId: number,
		amount: number,
		paymentTxId: string,
		paymentToken: string,
		retryCount: number,
		lastFailureReason: string,
	): void {
		const event = new PaymentRetryKafkaEvent({
			reservationId,
			userId,
			seatId,
			amount,
			paymentTxId,
			paymentToken,
			retryCount,
			lastFailureReason,
		});
		this.eventBus.publish(event);
	}

	publishPaymentFailure(
		reservationId: number,
		userId: number,
		paymentTxId: string,
		reason: string,
	): void {
		const event = new PaymentFailureKafkaEvent({
			reservationId,
			userId,
			paymentTxId,
			reason,
		});
		this.eventBus.publish(event);
	}

	publishPaymentCancel(
		reservationId: number,
		userId: number,
		seatId: number,
		amount: number,
		paymentTxId: string,
		reason: string,
	): void {
		const event = new PaymentCancelKafkaEvent({
			reservationId,
			userId,
			seatId,
			amount,
			paymentTxId,
			reason,
		});
		// 🟢TODO: 메시지키: userId-seatId
		this.eventBus.publish(event);
	}
}
