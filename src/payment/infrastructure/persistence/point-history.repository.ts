import { Injectable } from '@nestjs/common';
import { PointHistoryEntity } from '@prisma/client';
import { PrismaService } from 'src/common/services/prisma.service';
import {
	IPointHistoryRepository,
	PointHistoryType,
} from 'src/payment/application/domain/repositories/ipoint-history.repository';

@Injectable()
export class PointHistoryPrismaRepository implements IPointHistoryRepository {
	constructor(private prisma: PrismaService) {}

	async create(
		userId: number,
		type: PointHistoryType,
		amount: number,
	): Promise<PointHistoryEntity> {
		return this.prisma.pointHistoryEntity.create({
			data: {
				userId,
				type,
				amount,
			},
		});
	}

	async getByUserId(userId: number): Promise<PointHistoryEntity[]> {
		return this.prisma.pointHistoryEntity.findMany({
			where: {
				userId,
			},
		});
	}
}
