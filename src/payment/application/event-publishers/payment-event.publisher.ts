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
		const messageKey = `${userId}-${seatId}`;
		this.eventBus.publish(event, messageKey);
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
		const messageKey = `${userId}-${seatId}`;
		this.eventBus.publish(event, messageKey);
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
		const messageKey = `${userId}-${seatId}`;
		this.eventBus.publish(event, messageKey);
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
		const messageKey = `${userId}`;
		this.eventBus.publish(event, messageKey);
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
		const messageKey = `${userId}-${seatId}`;
		this.eventBus.publish(event, messageKey);
	}
}
