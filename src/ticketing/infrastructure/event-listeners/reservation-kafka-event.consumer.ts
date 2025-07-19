import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { DataPlatformService } from 'src/data-platform/application/services/data-platform.service';
import { PaymentService } from 'src/payment/application/services/payment.service';
import {
	ReservationFailureKafkaEvent,
	ReservationSuccessKafkaEvent,
} from 'src/ticketing/application/event-publishers/reservation-event';

@Controller()
export class ReservationKafkaEventConsumer {
	private readonly logger = new Logger(ReservationKafkaEventConsumer.name);

	constructor(
		private readonly dataPlatformService: DataPlatformService,
		private readonly paymentService: PaymentService,
	) {}

	@EventPattern('reservation.success')
	async onReservationSuccess(
		@Payload() event: ReservationSuccessKafkaEvent,
	): Promise<void> {
		try {
			this.logger.log('[Kafka] reservation.success event received');

			await this.dataPlatformService.send(event);
		} catch (error) {
			this.logger.error(
				`[Kafka] Failed to process reservation.success event: ${error.message}`,
			);
		}
	}

	// payment.cancel 이벤트 발행
	@EventPattern('reservation.failure')
	async onReservationFailure(
		@Payload() event: ReservationFailureKafkaEvent,
	): Promise<void> {
		try {
			this.logger.log('[Kafka] reservation.failure event received');

			const { reservationId, userId, seatId, amount, paymentTxId, reason } =
				event.data;
			// 결제 취소
			await this.paymentService.publishPaymentCancel(
				reservationId,
				userId,
				seatId,
				amount,
				paymentTxId,
				reason,
			);
			// 데이터 전송
			await this.dataPlatformService.send(event);
		} catch (error) {
			this.logger.error(
				`[Kafka] Failed to process reservation.failure event: ${error.message}`,
			);
		}
	}
}
