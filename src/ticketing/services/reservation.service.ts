import { Injectable } from '@nestjs/common';
import { ConcertRepository } from '../repositories/concert.repository';
import { PaymentResponseDto, QueueTokenResponseDto, ReserveResponseDto } from '../controllers/dtos/response.dto';

@Injectable()
export class ReservationService {
	constructor(private readonly concertRepository: ConcertRepository) {}

	async getToken(userId: number, concertId: number): Promise<QueueTokenResponseDto> {
		return {
			queueToken: 'queue-token',
		};
	}

	async reserve(userId: number, concertId: number): Promise<ReserveResponseDto> {
		return {
			reservationIds: [],
			paymentToken: 'payment-token',
		};
	}

	/**
	 * - reservationId로 금액 조회
	 * - paymentService.charge(userId, amount);
	 * - 좌석 임시배정 및 대기열 토큰 만료
	 */
	async payment(userId: number, reservationIds: number[]): Promise<PaymentResponseDto> {
		return {
			reservationIds,
		};
	}
}
