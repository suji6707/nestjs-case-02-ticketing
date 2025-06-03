import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/services/prisma.service';
import { Seat, SeatStatus } from 'src/ticketing/application/domain/models/seat';
import { ISeatRepository } from 'src/ticketing/application/domain/repositories/iseat.repository';

@Injectable()
export class SeatPrismaRepository implements ISeatRepository {
	constructor(private prisma: PrismaService) {}

	async findSeatById(seatId: number): Promise<Seat> {
		const entity = await this.prisma.seatEntity.findUnique({
			where: {
				id: seatId,
			},
		});
		if (!entity) {
			throw new Error('Seat not found');
		}
		return new Seat(entity);
	}

	async updateStatus(seatId: number, status: SeatStatus): Promise<Seat> {
		const entity = await this.prisma.seatEntity.update({
			where: {
				id: seatId,
			},
			data: {
				status,
			},
		});
		return new Seat(entity);
	}
}
