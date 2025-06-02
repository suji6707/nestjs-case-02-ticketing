import { Inject, Injectable } from '@nestjs/common';
import {
	PaymentResponseDto,
	ReserveResponseDto,
} from '../../controllers/dtos/response.dto';
import { IConcertRepository } from '../domain/repositories/iconcert.repository';

@Injectable()
export class ReservationService {
	constructor(
		@Inject('IConcertRepository')
		private readonly concertRepository: IConcertRepository,
	) {}

	async reserve(
		userId: number,
		concertId: number,
	): Promise<ReserveResponseDto> {
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
	async payment(
		userId: number,
		reservationIds: number[],
	): Promise<PaymentResponseDto> {
		return {
			reservationIds,
		};
	}
}
