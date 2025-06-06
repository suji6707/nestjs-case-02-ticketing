import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/services/prisma.service';
import { UserPoint } from 'src/payment/application/domain/models/user-point';
import { IUserPointRepository } from 'src/payment/application/domain/repositories/iuser-point.repository';

@Injectable()
export class UserPointPrismaRepository implements IUserPointRepository {
	constructor(private readonly prismaService: PrismaService) {}

	async create(userId: number): Promise<UserPoint> {
		const entity = await this.prismaService.userPointEntity.create({
			data: {
				userId,
				balance: 0,
			},
		});
		return new UserPoint(entity);
	}

	async findOne(userId: number): Promise<optional<UserPoint>> {
		const entity = await this.prismaService.userPointEntity.findUnique({
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
		const entity = await this.prismaService.userPointEntity.update({
			where: {
				userId: userPoint.userId,
			},
			data: {
				balance: userPoint.balance,
			},
		});
		return new UserPoint(entity);
	}
}
