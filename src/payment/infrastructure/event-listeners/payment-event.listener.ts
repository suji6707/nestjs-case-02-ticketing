import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { OnEventSafe } from 'src/common/decorators/on-event-safe.decorator';
import {
	PaymentCancelEvent,
	PaymentSuccessEvent,
} from 'src/payment/application/event-publishers/payment.event';
import { PaymentService } from 'src/payment/application/services/payment.service';
import { ReservationService } from 'src/ticketing/application/services/reservation.service';

@Injectable()
export class PaymentEventListener {
	private readonly logger = new Logger(PaymentEventListener.name);

	constructor(
		private readonly paymentService: PaymentService,
		private readonly reservationService: ReservationService,
	) {}

	@OnEventSafe('payment.success')
	async onPaymentSuccess(event: PaymentSuccessEvent): Promise<void> {
		this.logger.log('payment.success event received');

		const { reservationId, userId, seatId, amount, paymentTxId } = event.data;
		await this.reservationService.confirmReservation(
			reservationId,
			userId,
			seatId,
			amount,
			paymentTxId,
		);
		return;
	}

	@OnEventSafe('payment.cancel')
	async onPaymentCancel(event: PaymentCancelEvent): Promise<void> {
		this.logger.log('payment.cancel event received');

		// user point 복원 및 point history에 환불 기록 추가
		const { userId, amount } = event.data;
		await this.paymentService.cancelPayment(userId, amount);
		return;
	}
}
