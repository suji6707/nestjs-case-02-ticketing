import { PointHistoryEntity } from '@prisma/client';

export enum PointHistoryType {
	CHARGE = 1,
	USE = 2,
	REFUND = 3,
}

export interface IPointHistoryRepository {
	create(
		userId: number,
		type: PointHistoryType,
		amount: number,
	): Promise<PointHistoryEntity>;
	getByUserId(userId: number): Promise<PointHistoryEntity[]>;
}
