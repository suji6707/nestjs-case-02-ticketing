import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { Injectable } from '@nestjs/common';
import { UserPointEntity } from '@prisma/client';
import { UserPoint } from 'src/payment/application/domain/models/user-point';
import { IUserPointRepository } from 'src/payment/application/domain/repositories/iuser-point.repository';

@Injectable()
export class UserPointPrismaRepository implements IUserPointRepository {
	constructor(
		private readonly txHost: TransactionHost<TransactionalAdapterPrisma>,
	) {}

	private makeOutput(raw: any): UserPoint {
		const props = {
			id: raw.id,
			userId: raw.user_id,
			balance: raw.balance,
			createdAt: raw.created_at,
			updatedAt: raw.updated_at,
		};
		return new UserPoint(props);
	}

	async create(userId: number): Promise<UserPoint> {
		const entity = await this.txHost.tx.userPointEntity.create({
			data: {
				userId,
				balance: 0,
			},
		});
		return new UserPoint(entity);
	}

	async findOne(userId: number): Promise<optional<UserPoint>> {
		const entity = await this.txHost.tx.userPointEntity.findUnique({
			where: {
				userId,
			},
		});
		if (!entity) {
			return null;
		}
		return new UserPoint(entity);
	}

	async update(userPoint: UserPoint): Promise<UserPoint> {
		const entity = await this.txHost.tx.userPointEntity.update({
			where: {
				userId: userPoint.userId,
			},
			data: {
				balance: userPoint.balance,
			},
		});
		return new UserPoint(entity);
	}

	async selectForUpdate(userId: number): Promise<optional<UserPoint>> {
		const result = await this.txHost.tx.$queryRaw<UserPointEntity[]>`
			SELECT * FROM user_points
			WHERE user_id = ${userId}
			FOR UPDATE;
		`;
		if (result.length > 0) {
			return this.makeOutput(result[0]);
		}
		return null;
	}
}
