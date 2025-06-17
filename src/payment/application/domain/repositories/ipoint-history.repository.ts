import { PrismaTransactionalClient } from '@nestjs-cls/transactional-adapter-prisma';
import { PointHistoryEntity } from '@prisma/client';

export enum PointHistoryType {
	CHARGE = 1,
	USE = 2,
}

export interface IPointHistoryRepository {
	create(
		userId: number,
		type: PointHistoryType,
		amount: number,
		tx?: PrismaTransactionalClient,
	): Promise<PointHistoryEntity>;
	getByUserId(userId: number): Promise<PointHistoryEntity[]>;
}
