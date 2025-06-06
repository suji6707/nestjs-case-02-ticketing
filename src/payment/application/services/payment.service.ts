import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { Inject, Injectable } from '@nestjs/common';
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
	constructor(
		private readonly txHost: TransactionHost<TransactionalAdapterPrisma>,
		@Inject('IUserPointRepository')
		private readonly userPointRepository: IUserPointRepository,
		@Inject('IPointHistoryRepository')
		private readonly pointHistoryRepository: IPointHistoryRepository,
	) {}

	async charge(userId: number, amount: number): Promise<ChargeResponseDto> {
		let userPoint = await this.userPointRepository.findOne(userId);
		if (!userPoint) {
			userPoint = await this.userPointRepository.create(userId);
		}

		const updatedUserPoint = await this.txHost.withTransaction(
			async (): Promise<UserPoint> => {
				await this.pointHistoryRepository.create(
					userId,
					PointHistoryType.CHARGE,
					amount,
				);
				// domain logic
				userPoint.charge(amount);
				return await this.userPointRepository.update(userPoint);
			},
		);

		return { balance: updatedUserPoint.balance };
	}

	async use(userId: number, amount: number): Promise<PointUseResponseDto> {
		const userPoint = await this.userPointRepository.findOne(userId);
		if (!userPoint) {
			throw new Error('NOT_FOUND_USER_POINT');
		}

		// domain logic
		userPoint.use(amount);

		const updatedUserPoint = await this.txHost.withTransaction(async () => {
			await this.pointHistoryRepository.create(
				userId,
				PointHistoryType.USE,
				amount,
			);
			return await this.userPointRepository.update(userPoint);
		});

		return { balance: updatedUserPoint.balance };
	}
}
