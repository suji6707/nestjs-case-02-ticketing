import { PrismaTransactionalClient } from '@nestjs-cls/transactional-adapter-prisma';
import { UserPoint } from '../models/user-point';

export interface IUserPointRepository {
	create(userId: number): Promise<UserPoint>;
	findOne(userId: number): Promise<UserPoint>;
	update(
		userPoint: UserPoint,
		tx?: PrismaTransactionalClient,
	): Promise<UserPoint>;
	selectForUpdate(
		userId: number,
		tx?: PrismaTransactionalClient,
	): Promise<optional<UserPoint>>;
}
