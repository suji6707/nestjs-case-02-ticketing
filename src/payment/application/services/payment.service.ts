import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { Inject, Injectable } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { IDistributedLockService } from 'src/common/interfaces/idistributed-lock.service';
import {
	DISTRIBUTED_LOCK_SERVICE,
	PAYMENT_LOCK_TTL,
} from 'src/common/utils/constants';
import { getPaymentLockKey } from 'src/common/utils/redis-keys';
import {
	ChargeResponseDto,
	PointUseResponseDto,
} from 'src/payment/constrollers/dtos/response.dto';
import { UserPoint } from '../domain/models/user-point';
import {
	IPointHistoryRepository,
	PointHistoryType,
} from '../domain/repositories/ipoint-history.repository';
import { IUserPointRepository } from '../domain/repositories/iuser-point.repository';

@Injectable()
export class PaymentService {
	private readonly logger = new Logger(PaymentService.name);

	constructor(
		private readonly txHost: TransactionHost<TransactionalAdapterPrisma>,
		@Inject('IUserPointRepository')
		private readonly userPointRepository: IUserPointRepository,
		@Inject('IPointHistoryRepository')
		private readonly pointHistoryRepository: IPointHistoryRepository,
		@Inject(DISTRIBUTED_LOCK_SERVICE)
		private readonly distributedLockService: IDistributedLockService,
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

		return { balance: updatedUserPoint.balance };
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

	async getBalance(userId: number): Promise<PointUseResponseDto> {
		const userPoint = await this.userPointRepository.findOne(userId);
		if (!userPoint) {
			throw new Error('NOT_FOUND_USER_POINT');
		}
		return { balance: userPoint.balance };
	}
}
