import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { Inject, Injectable } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { PaymentTransactionEntity } from '@prisma/client';
import { IDistributedLockService } from 'src/common/interfaces/idistributed-lock.service';
import {
	DISTRIBUTED_LOCK_SERVICE,
	PAYMENT_LOCK_TTL,
} from 'src/common/utils/constants';
import { getPaymentLockKey } from 'src/common/utils/redis-keys';
import {
	ChargeResponseDto,
	PaymentProcessResponseDto,
	PointUseResponseDto,
} from 'src/payment/constrollers/dtos/response.dto';
import { TokenStatus } from 'src/ticketing/application/domain/models/token';
import { IReservationRepository } from 'src/ticketing/application/domain/repositories/ireservation.repository';
import { PaymentTokenService } from 'src/ticketing/application/services/payment-token.service';
import { v4 as uuidv4 } from 'uuid';
import { UserPoint } from '../domain/models/user-point';
import {
	IPaymentTransactionRepository,
	PaymentTransactionStatus,
} from '../domain/repositories/ipayment-transaction.repository';
import {
	IPointHistoryRepository,
	PointHistoryType,
} from '../domain/repositories/ipoint-history.repository';
import { IUserPointRepository } from '../domain/repositories/iuser-point.repository';
import { PaymentEventPublisher } from '../event-publishers/payment-event.publisher';

@Injectable()
export class PaymentService {
	private readonly logger = new Logger(PaymentService.name);

	constructor(
		private readonly txHost: TransactionHost<TransactionalAdapterPrisma>,
		@Inject('IUserPointRepository')
		private readonly userPointRepository: IUserPointRepository,
		@Inject('IPointHistoryRepository')
		private readonly pointHistoryRepository: IPointHistoryRepository,
		@Inject('IReservationRepository')
		private readonly reservationRepository: IReservationRepository,
		@Inject('IPaymentTransactionRepository')
		private readonly paymentTransactionRepository: IPaymentTransactionRepository,
		@Inject('PaymentTokenService')
		private readonly paymentTokenService: PaymentTokenService,
		@Inject(DISTRIBUTED_LOCK_SERVICE)
		private readonly distributedLockService: IDistributedLockService,
		private readonly paymentEventPublisher: PaymentEventPublisher,
	) {}

	async charge(userId: number, amount: number): Promise<ChargeResponseDto> {
		const startTime = Date.now();
		// 분산락 + 조건부 UPDATE
		const updatedUserPoint = await this.distributedLockService.withLock(
			getPaymentLockKey(userId),
			PAYMENT_LOCK_TTL,
			async () => {
				return await this._chargeTransaction(userId, amount);
			},
			10,
			100,
		);

		const endTime = Date.now();
		this.logger.log(`exec time: ${endTime - startTime}ms`);

		return { balance: updatedUserPoint.balance };
	}

	async _chargeTransaction(userId: number, amount: number): Promise<UserPoint> {
		return await this.txHost.withTransaction(async (): Promise<UserPoint> => {
			// 없으면 생성
			let userPoint = await this.userPointRepository.findOne(userId);
			if (!userPoint) {
				userPoint = await this.userPointRepository.create(userId);
			}
			await this.pointHistoryRepository.create(
				userId,
				PointHistoryType.CHARGE,
				amount,
			);
			// domain logic
			userPoint.charge(amount);
			return await this.userPointRepository.update(userPoint);
		});
	}

	// old ver.
	async use(userId: number, amount: number): Promise<PointUseResponseDto> {
		const startTime = Date.now();
		// 분산락 + X-lock
		const updatedUserPoint = await this.distributedLockService.withLock(
			getPaymentLockKey(userId),
			PAYMENT_LOCK_TTL,
			async () => {
				return await this._useTransaction(userId, amount);
			},
			10,
			100,
		);

		const endTime = Date.now();
		this.logger.log(`exec time: ${endTime - startTime}ms`);

		// 이벤트 발행
		// const reservationContext =
		// 	await this.reservationRepository.getReservationContext(userId);
		// await this.paymentEventPublisher.publishPaymentSuccess(reservationContext);

		return { balance: updatedUserPoint.balance };
	}

	// new ver.
	async processPaymentAndReservation(
		userId: number,
		reservationId: number,
		paymentToken: string,
		paymentTxId?: string,
	): Promise<PaymentProcessResponseDto> {
		if (!paymentTxId) {
			paymentTxId = uuidv4();
		}
		// verify
		const isValidToken = await this.paymentTokenService.verifyToken(
			userId,
			paymentToken,
			TokenStatus.WAITING,
		);
		if (!isValidToken) {
			throw new Error('Invalid payment token');
		}

		// 예약 정보 조회
		const reservation = await this.reservationRepository.findOne(reservationId);
		const seatId = reservation.seatId;
		const amount = reservation.purchasePrice;

		// payment.try 이벤트 발행 (여기선 항상 첫번째 시도. 재시도는 payment.retry 이벤트에서)
		this.paymentEventPublisher.publishPaymentTry(
			reservationId,
			userId,
			seatId,
			amount,
			paymentTxId,
			paymentToken,
		);

		// 즉시 응답 반환. 클라이언트 폴링으로 paymentTransaction.status 확인
		return {
			paymentTxId,
			status: 'PAYMENT_PROCESSING',
			message: '결제 처리 중입니다. 잠시 후 결과를 확인해주세요.',
		};
	}

	async _useTransaction(userId: number, amount: number): Promise<UserPoint> {
		return await this.txHost.withTransaction(async () => {
			const userPoint = await this.userPointRepository.selectForUpdate(userId);
			if (!userPoint) {
				throw new Error('NOT_FOUND_USER_POINT');
			}
			await this.pointHistoryRepository.create(
				userId,
				PointHistoryType.USE,
				amount,
			);
			// domain logic
			userPoint.use(amount);
			return await this.userPointRepository.update(userPoint);
		});
	}

	// =========================== KAFKA EVENT =======================================
	async createPaymentTransaction(
		paymentTxId: string,
		userId: number,
		seatId: number,
	): Promise<void> {
		await this.paymentTransactionRepository.create(
			paymentTxId,
			userId,
			seatId,
			PaymentTransactionStatus.PENDING,
		);
	}

	async executePayment(
		reservationId: number,
		userId: number,
		seatId: number,
		amount: number,
		paymentTxId: string,
		paymentToken: string,
	): Promise<void> {
		// 분산락 + X-lock
		await this.distributedLockService.withLock(
			getPaymentLockKey(userId),
			PAYMENT_LOCK_TTL,
			async () => {
				return await this._useTransaction(userId, amount);
			},
			10,
			100,
		);
		await this.paymentTokenService.deleteToken(paymentToken); // 결제 완료시 임시 결제토큰 삭제

		// 이벤트 발행
		this.paymentEventPublisher.publishPaymentSuccess(
			reservationId,
			userId,
			seatId,
			amount,
			paymentTxId,
		);
	}

	async publishPaymentFailure(
		reservationId: number,
		userId: number,
		paymentTxId: string,
		reason: string,
	): Promise<void> {
		// 1. 트랜잭션 상태 업데이트
		await this.paymentTransactionRepository.updateStatus(
			paymentTxId,
			PaymentTransactionStatus.FAILURE,
		);

		// 2. 실패 이벤트 발행
		this.paymentEventPublisher.publishPaymentFailure(
			reservationId,
			userId,
			paymentTxId,
			reason,
		);
	}

	async publishPaymentRetry(
		reservationId: number,
		userId: number,
		seatId: number,
		amount: number,
		paymentTxId: string,
		paymentToken: string,
		retryCount: number,
		lastFailureReason: string,
	): Promise<void> {
		// 1. 트랜잭션 상태 업데이트
		await this.paymentTransactionRepository.updateStatus(
			paymentTxId,
			PaymentTransactionStatus.RETRYING,
			retryCount,
			lastFailureReason,
		);
		// 2. 재시도 이벤트 발행
		this.paymentEventPublisher.publishPaymentRetry(
			reservationId,
			userId,
			seatId,
			amount,
			paymentTxId,
			paymentToken,
			retryCount,
			lastFailureReason,
		);
	}

	async publishPaymentCancel(
		reservationId: number,
		userId: number,
		seatId: number,
		amount: number,
		paymentTxId: string,
		reason: string,
	): Promise<void> {
		// 1. 트랜잭션 상태 업데이트
		await this.paymentTransactionRepository.updateStatus(
			paymentTxId,
			PaymentTransactionStatus.CANCEL,
		);
		// 2. 취소 이벤트 발행
		this.paymentEventPublisher.publishPaymentCancel(
			reservationId,
			userId,
			seatId,
			amount,
			paymentTxId,
			reason,
		);
	}

	async cancelPayment(userId: number, amount: number): Promise<UserPoint> {
		return await this.txHost.withTransaction(async () => {
			const userPoint = await this.userPointRepository.selectForUpdate(userId);
			if (!userPoint) {
				throw new Error('NOT_FOUND_USER_POINT');
			}
			await this.pointHistoryRepository.create(
				userId,
				PointHistoryType.REFUND,
				amount,
			);
			// domain logic
			userPoint.refund(amount);
			return await this.userPointRepository.update(userPoint);
		});
	}

	// =========================== KAFKA EVENT HELPER FUNC =======================================
	async findPendingTransaction(
		paymentTxId: string,
	): Promise<PaymentTransactionEntity | null> {
		return this.paymentTransactionRepository.findByPaymentTxId(paymentTxId);
	}

	// 기타
	async getBalance(userId: number): Promise<PointUseResponseDto> {
		const userPoint = await this.userPointRepository.findOne(userId);
		if (!userPoint) {
			throw new Error('NOT_FOUND_USER_POINT');
		}
		return { balance: userPoint.balance };
	}
}
