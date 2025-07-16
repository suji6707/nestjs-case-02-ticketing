import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import {
	PaymentCancelKafkaEvent,
	PaymentSuccessKafkaEvent,
} from 'src/payment/application/event-publishers/payment.event';
import { PaymentService } from 'src/payment/application/services/payment.service';
import { ReservationService } from 'src/ticketing/application/services/reservation.service';

@Controller()
export class PaymentKafkaEventConsumer {
	private readonly logger = new Logger(PaymentKafkaEventConsumer.name);

	constructor(
		private readonly paymentService: PaymentService,
		private readonly reservationService: ReservationService,
	) {}

	@EventPattern('payment.success')
	async onPaymentSuccess(
		@Payload() event: PaymentSuccessKafkaEvent,
	): Promise<void> {
		try {
			this.logger.log(
				`[Kafka] Received payment.success event: ${event.eventId}`,
			);

			const { reservationId } = event.data;
			await this.reservationService.confirmReservation(reservationId);
			return;
		} catch (error) {
			this.logger.error(
				`[Kafka] Failed to process payment.success event: ${error.message}`,
			);
		}
	}

	@EventPattern('payment.cancel')
	async onPaymentCancel(
		@Payload() event: PaymentCancelKafkaEvent,
	): Promise<void> {
		try {
			this.logger.log(
				`[Kafka] Received payment.cancel event: ${event.eventId}`,
			);

			// user point 복원 및 point history에 환불 기록 추가
			const { userId, amount } = event.data;
			await this.paymentService.cancelPayment(userId, amount);
			return;
		} catch (error) {
			this.logger.error(
				`[Kafka] Failed to process payment.cancel event: ${error.message}`,
			);
		}
	}
}
