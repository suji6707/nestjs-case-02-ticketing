import { Injectable } from '@nestjs/common';
import { UserPoint } from '@prisma/client';
import { PrismaService } from '../../common/services/prisma.service';

@Injectable()
export class PaymentService {
	constructor(private readonly prismaService: PrismaService) {}

	async charge(userId: number, amount: number): Promise<{ balance: number }> {
		const userPoint = await this.prismaService.userPoint.update({
			where: {
				userId,
			},
			data: {
				balance: {
					increment: amount,
				},
			},
		});
		return { balance: userPoint.balance };
	}

	async getBalance(userId: number): Promise<{ balance: number }> {
		const userPoint = await this.prismaService.userPoint.findUnique({
			where: {
				userId,
			},
		});
		return { balance: userPoint.balance };
	}

	/**
	 * 잔액이 충분한지 확인하고, 충분하면 잔액 차감
	 */
	async use(userId: number, amount: number): Promise<{ balance: number }> {
		const userPoint = await this.getBalance(userId);
		if (userPoint.balance < amount) {
			throw new Error('잔액이 부족합니다');
		}
		return this.charge(userId, -amount);
	}
}
