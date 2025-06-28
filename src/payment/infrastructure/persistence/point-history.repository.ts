import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { Injectable } from '@nestjs/common';
import { PointHistoryEntity } from '@prisma/client';
import {
	IPointHistoryRepository,
	PointHistoryType,
} from 'src/payment/application/domain/repositories/ipoint-history.repository';

@Injectable()
export class PointHistoryPrismaRepository implements IPointHistoryRepository {
	constructor(
		private readonly txHost: TransactionHost<TransactionalAdapterPrisma>,
	) {}

	async create(
		userId: number,
		type: PointHistoryType,
		amount: number,
	): Promise<PointHistoryEntity> {
		return this.txHost.tx.pointHistoryEntity.create({
			data: {
				userId,
				type,
				amount,
			},
		});
	}

	async getByUserId(userId: number): Promise<PointHistoryEntity[]> {
		return this.txHost.tx.pointHistoryEntity.findMany({
			where: {
				userId,
			},
		});
	}
}
