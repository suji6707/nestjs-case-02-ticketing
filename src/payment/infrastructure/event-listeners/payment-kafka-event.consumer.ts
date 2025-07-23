import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import {
	PaymentCancelKafkaEvent,
	PaymentRetryKafkaEvent,
	PaymentSuccessKafkaEvent,
	PaymentTryKafkaEvent,
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

	// pending 상태 트랜잭션 있는지 확인
	@EventPattern('payment.try')
	async onPaymentTry(@Payload() event: PaymentTryKafkaEvent): Promise<void> {
		try {
			this.logger.log(`[Kafka] Received payment.try event: ${event.eventId}`);

			const {
				reservationId,
				userId,
				seatId,
				amount,
				paymentTxId,
				paymentToken,
			} = event.data;
			const pendingTransaction =
				await this.paymentService.findPendingTransaction(paymentTxId);
			if (pendingTransaction) {
				this.logger.warn(
					`[Kafka] Duplicate payment.try event ignored - paymentTxId: ${paymentTxId} already exists`,
				);
				return; // 멱등성 보장: 중복 요청 무시
			}

			await this.paymentService.createPaymentTransaction(
				paymentTxId,
				userId,
				seatId,
			);
			await this.paymentService.executePayment(
				reservationId,
				userId,
				seatId,
				amount,
				paymentTxId,
				paymentToken,
			);
			this.logger.log(
				`[Kafka] Payment processing completed successfully - paymentTxId: ${paymentTxId}`,
			);
		} catch (error) {
			// 에러 발생 시 payment.retry 이벤트 발행
			this.logger.error(
				`[Kafka] Failed to process payment.try event: ${error.message}`,
			);
			try {
				const {
					reservationId,
					userId,
					seatId,
					amount,
					paymentTxId,
					paymentToken,
				} = event.data;
				await this.paymentService.publishPaymentRetry(
					reservationId,
					userId,
					seatId,
					amount,
					paymentTxId,
					paymentToken,
					1,
					error.message,
				);
			} catch (publishError) {
				this.logger.error(
					`[Kafka] Failed to publish payment.retry event: ${publishError.message}`,
				);
			}
		}
	}

	@EventPattern('payment.success')
	async onPaymentSuccess(
		@Payload() event: PaymentSuccessKafkaEvent,
	): Promise<void> {
		try {
			this.logger.log(
				`[Kafka] Received payment.success event: ${event.eventId}`,
			);

			const { reservationId, userId, seatId, amount, paymentTxId } = event.data;
			await this.reservationService.confirmReservation(
				reservationId,
				userId,
				seatId,
				amount,
				paymentTxId,
			);
			return;
		} catch (error) {
			this.logger.error(
				`[Kafka] Failed to process payment.success event: ${error.message}`,
			);
		}
	}

	@EventPattern('payment.retry')
	async onPaymentRetry(
		@Payload() event: PaymentRetryKafkaEvent,
	): Promise<void> {
		try {
			this.logger.log(`[Kafka] Received payment.retry event: ${event.eventId}`);

			const {
				reservationId,
				userId,
				seatId,
				amount,
				paymentTxId,
				paymentToken,
				retryCount,
			} = event.data;

			// Exponential backoff 지연 (1s, 2s, 4s)
			const delayMs = 2 ** (retryCount - 1) * 1000;
			this.logger.log(
				`[Kafka] Retrying payment after ${delayMs}ms delay - attempt ${retryCount}/3`,
			);
			await new Promise((resolve) => setTimeout(resolve, delayMs));

			// 결제 실행
			await this.paymentService.executePayment(
				reservationId,
				userId,
				seatId,
				amount,
				paymentTxId,
				paymentToken,
			);

			this.logger.log(
				`[Kafka] Payment retry successful - paymentTxId: ${paymentTxId}, attempt: ${retryCount}`,
			);
		} catch (error) {
			// 재시도 실패 시 다음 재시도 또는 최종 실패 처리
			this.logger.error(
				`[Kafka] Payment retry failed - attempt ${event.data.retryCount}/3: ${error.message}`,
			);
			try {
				const {
					reservationId,
					userId,
					seatId,
					amount,
					paymentTxId,
					paymentToken,
					retryCount,
				} = event.data;

				if (retryCount < 3) {
					// 다음 재시도 발행
					await this.paymentService.publishPaymentRetry(
						reservationId,
						userId,
						seatId,
						amount,
						paymentTxId,
						paymentToken,
						retryCount + 1,
						error.message,
					);
				} else {
					// 최종 실패 처리
					await this.paymentService.publishPaymentFailure(
						reservationId,
						userId,
						paymentTxId,
						`Max retry attempts exceeded: ${error.message}`,
					);
				}
			} catch (publishError) {
				this.logger.error(
					`[Kafka] Failed to publish next retry/failure event: ${publishError.message}`,
				);
			}
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
