import { TransactionHost, Transactional } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { Inject, Injectable } from '@nestjs/common';
import { SEAT_LOCK_TTL } from 'src/common/utils/constants';
import { EXPIRE_QUEUE_NAME } from 'src/common/utils/redis-keys';
import { PaymentService } from 'src/payment/application/services/payment.service';
import { QueueProducer } from 'src/ticketing/infrastructure/external/queue-producer.service';
import {
	PaymentResponseDto,
	ReserveResponseDto,
} from '../../controllers/dtos/response.dto';
import { Reservation } from '../domain/models/reservation';
import { Seat } from '../domain/models/seat';
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
		private readonly paymentService: PaymentService,
		private readonly txHost: TransactionHost<TransactionalAdapterPrisma>,
		private readonly queueProducer: QueueProducer,
	) {}

	async temporaryReserve(
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
		// @@@TODO: redis lock timeout 설정
		const acquired = await this.seatLockService.lockSeat(seatId, queueToken);
		if (!acquired) {
			throw new Error('ALREADY_RESERVED');
		}

		// if success, issue payment token - set Redis
		const { token: paymentToken } = await this.paymentTokenService.createToken({
			userId,
			seatId,
		});

		// domain logic
		const seat = await this.seatRepository.findOne(seatId);
		seat.setReserved();
		const reservation = new Reservation({
			userId,
			seatId: seat.id,
			purchasePrice: seat.price,
		});

		// transaction
		const newReservation = await this._reserveTransaction(seat, reservation);

		// 5분뒤 만료 작업을 큐에 추가
		await this.queueProducer.addJob(
			EXPIRE_QUEUE_NAME,
			{
				reservationId: newReservation.id,
				seatId: seatId,
				lockToken: queueToken, // 잠금 해제시 필요
			},
			{
				delay: SEAT_LOCK_TTL * 1000, // 5분 지연!!
			},
		);

		return {
			reservationId: newReservation.id,
			paymentToken,
		};
	}

	@Transactional()
	async _reserveTransaction(
		seat: Seat,
		reservation: Reservation,
	): Promise<Reservation> {
		await this.seatRepository.update(seat);
		const newReservation = await this.reservationRepository.create(reservation);
		return newReservation;
	}

	async confirmReservation(
		userId: number,
		reservationId: number,
		paymentToken: string,
	): Promise<PaymentResponseDto> {
		// verify
		const isValidToken = await this.paymentTokenService.verifyToken(
			userId,
			paymentToken,
		);
		if (!isValidToken) {
			throw new Error('Invalid payment token');
		}

		// get reservation info -> price
		const reservation = await this.reservationRepository.findOne(reservationId);
		if (!reservation) {
			throw new Error('NOT_FOUND_RESERVATION');
		}

		// 결제 모듈 호출
		await this.paymentService.use(userId, reservation.purchasePrice);

		// 좌석 최종 배정
		const seat = await this.seatRepository.findOne(reservation.seatId);
		seat.setSold();
		reservation.setConfirmed();

		const updatedReservation = await this.txHost.withTransaction(async () => {
			await this.seatRepository.update(seat);
			return await this.reservationRepository.update(reservation);
		});

		await this.paymentTokenService.deleteToken(paymentToken);

		return {
			reservation: {
				id: updatedReservation.id,
				seatId: updatedReservation.seatId,
				purchasePrice: updatedReservation.purchasePrice,
				status: updatedReservation.status,
				paidAt: updatedReservation.paidAt,
			},
		};
	}
}
