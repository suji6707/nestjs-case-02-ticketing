import { TransactionHost, Transactional } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { ConflictException, Inject, Injectable, Logger } from '@nestjs/common';
import { IDistributedLockService } from 'src/common/interfaces/idistributed-lock.service';
import { RedisService } from 'src/common/services/redis/redis.service';
import {
	DISTRIBUTED_LOCK_SERVICE,
	SEAT_EXPIRE_TTL,
	SEAT_LOCK_TTL,
} from 'src/common/utils/constants';
import {
	EXPIRE_QUEUE_NAME,
	getSeatLockKey,
	getSeatsCacheKey,
} from 'src/common/utils/redis-keys';
import { PaymentService } from 'src/payment/application/services/payment.service';
import { QueueProducer } from 'src/ticketing/infrastructure/external/queue-producer.service';
import {
	PaymentResponseDto,
	ReserveResponseDto,
} from '../../controllers/dtos/response.dto';
import { Reservation, ReservationStatus } from '../domain/models/reservation';
import { Seat, SeatStatus } from '../domain/models/seat';
import { IReservationRepository } from '../domain/repositories/ireservation.repository';
import { ISeatRepository } from '../domain/repositories/iseat.repository';
import { ITokenService } from './interfaces/itoken.service';

@Injectable()
export class ReservationService {
	private readonly logger = new Logger(ReservationService.name);

	constructor(
		@Inject('ISeatRepository')
		private readonly seatRepository: ISeatRepository,
		@Inject('IReservationRepository')
		private readonly reservationRepository: IReservationRepository,
		@Inject('QueueTokenService')
		private readonly queueTokenService: ITokenService,
		@Inject('PaymentTokenService')
		private readonly paymentTokenService: ITokenService,
		private readonly paymentService: PaymentService,
		private readonly txHost: TransactionHost<TransactionalAdapterPrisma>,
		private readonly queueProducer: QueueProducer,
		@Inject(DISTRIBUTED_LOCK_SERVICE)
		private readonly distributedLockService: IDistributedLockService,
		private readonly redisService: RedisService,
	) {}

	async temporaryReserve(
		userId: number,
		seatId: number,
		queueToken: string,
	): Promise<ReserveResponseDto> {
		try {
			// token verify
			const isValidToken = await this.queueTokenService.verifyToken(
				userId,
				queueToken,
			);
			if (!isValidToken) {
				throw new Error('Invalid queue token');
			}

			// domain logic
			const seat = await this.seatRepository.findOne(seatId);
			seat.setReserved();
			const reservation = new Reservation({
				userId,
				seatId: seat.id,
				purchasePrice: seat.price,
			});

			// 분산락 + db 조건부 UPDATE
			let newReservation: Reservation;
			let paymentToken: string;
			try {
				newReservation =
					await this.distributedLockService.withLock<Reservation>(
						getSeatLockKey(seatId),
						SEAT_LOCK_TTL,
						async () => {
							// BEGIN
							return await this._reserveWithOptimisticLock(seat, reservation);
							// COMMIT
						},
						1, // 재시도 X. 한 요청만 락을 획득하고 나머지는 실패하는것이 정상
					);

				// Write back to cache
				const cacheKey = getSeatsCacheKey(seatId);
				const obj = {
					[seatId]: {
						className: seat.className,
						price: seat.price,
						status: seat.status,
					},
				};
				await this.redisService.hsetField(cacheKey, obj);

				// 결제토큰 발급
				const { token } = await this.paymentTokenService.createToken({
					userId,
					seatId,
				});
				paymentToken = token;
			} catch (error) {
				this.logger.error(error);
				throw new Error('FAILED_TO_ACQUIRE_LOCK'); // 이미 예약된 좌석입니다
			}

			// 5분뒤 만료 작업을 큐에 추가
			await this.queueProducer.addJob(
				EXPIRE_QUEUE_NAME,
				{
					reservationId: newReservation.id,
					seatId: seatId,
					lockToken: queueToken, // 잠금 해제시 필요
				},
				{
					delay: SEAT_EXPIRE_TTL * 1000, // 5분 지연!!
				},
			);

			return {
				reservationId: newReservation.id,
				paymentToken,
			};
		} catch (error) {
			this.logger.error(error);
			throw error;
		}
	}

	@Transactional()
	async _reserveWithOptimisticLock(
		seat: Seat,
		reservation: Reservation,
	): Promise<Reservation> {
		const seatBefore = await this.seatRepository.findOne(seat.id);
		if (seatBefore.status !== SeatStatus.AVAILABLE) {
			throw new ConflictException('ALREADY_RESERVED');
		}
		await this.seatRepository.update(seat, SeatStatus.AVAILABLE);
		const newReservation = await this.reservationRepository.create(reservation);
		console.log('newReservation', newReservation);
		return newReservation;
	}

	@Transactional()
	async _reserveWithPessimisticLock(
		seat: Seat,
		reservation: Reservation,
	): Promise<Reservation> {
		const seatBefore = await this.seatRepository.selectForUpdate(seat.id);
		console.log('seatBefore', seatBefore);
		if (seatBefore.status !== SeatStatus.AVAILABLE) {
			throw new ConflictException('ALREADY_RESERVED');
		}
		await this.seatRepository.update(seat, SeatStatus.AVAILABLE);
		const newReservation = await this.reservationRepository.create(reservation);
		console.log('newReservation', newReservation);
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

		// 좌석 최종 배정
		const updatedReservation = await this.txHost.withTransaction(async () => {
			// 예약상태 변경
			const reservation =
				await this.reservationRepository.findOne(reservationId);
			console.log('🟡reservation', reservation);
			if (reservation.status !== ReservationStatus.PENDING) {
				throw new Error('NOT_PENDING_RESERVATION');
			}
			reservation.setConfirmed();
			const updatedReservation = await this.reservationRepository.update(
				reservation,
				ReservationStatus.PENDING,
			);

			// 좌석상태 변경
			const seat = await this.seatRepository.findOne(reservation.seatId);
			seat.setSold();
			await this.seatRepository.update(seat, SeatStatus.RESERVED);

			// 결제 모듈 호출
			await this.paymentService.use(userId, reservation.purchasePrice);

			return updatedReservation;
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

	async getInfo(reservationId: number): Promise<optional<Reservation>> {
		return this.reservationRepository.findOne(reservationId);
	}
}
