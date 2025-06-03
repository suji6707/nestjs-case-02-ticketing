import { Transactional } from '@nestjs-cls/transactional';
import { Inject, Injectable } from '@nestjs/common';
import {
	PaymentResponseDto,
	ReserveResponseDto,
} from '../../controllers/dtos/response.dto';
import { Reservation, ReservationStatus } from '../domain/models/reservation';
import { SeatStatus } from '../domain/models/seat';
import { IReservationRepository } from '../domain/repositories/ireservation.repository';
import { ISeatRepository } from '../domain/repositories/iseat.repository';
import { ITokenService } from './interfaces/itoken.service';
import { SeatLockService } from './seat-lock.service';

@Injectable()
export class ReservationService {
	constructor(
		@Inject('ISeatRepository')
		private readonly seatRepository: ISeatRepository,
		@Inject('IReservationRepository')
		private readonly reservationRepository: IReservationRepository,
		@Inject('QueueTokenService')
		private readonly queueTokenService: ITokenService,
		@Inject('PaymentTokenService')
		private readonly paymentTokenService: ITokenService,
		private readonly seatLockService: SeatLockService,
	) {}

	async reserve(
		userId: number,
		seatId: number,
		queueToken: string,
	): Promise<ReserveResponseDto> {
		// token verify
		const isValidToken = await this.queueTokenService.verifyToken(
			userId,
			queueToken,
		);
		if (!isValidToken) {
			throw new Error('Invalid queue token');
		}

		// set Redis lock, val = queueToken
		const acquired = await this.seatLockService.lockSeat(seatId, queueToken);
		if (!acquired) {
			throw new Error('ALREADY_RESERVED');
		}

		// if success, issue payment token - set Redis
		const { token: paymentToken } = await this.paymentTokenService.createToken({
			userId,
			seatId,
		});

		const reservation = await this._reserveTransaction(userId, seatId);

		return {
			reservationId: reservation.id,
			paymentToken,
		};
	}

	@Transactional()
	async _reserveTransaction(
		userId: number,
		seatId: number,
	): Promise<Reservation> {
		const seat = await this.seatRepository.updateStatus(
			seatId,
			SeatStatus.RESERVED,
		);
		const reservation = await this.reservationRepository.create({
			userId,
			seatId,
			status: ReservationStatus.PENDING,
			purchasePrice: seat.price,
		});
		return reservation;
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
		// update db seat sold.
		// update db reservation paidAt
		return {
			reservationIds,
		};
	}
}
