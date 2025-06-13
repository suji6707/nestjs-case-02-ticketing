import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/services/prisma.service';
import { Seat } from 'src/ticketing/application/domain/models/seat';
import { ISeatRepository } from 'src/ticketing/application/domain/repositories/iseat.repository';

@Injectable()
export class SeatPrismaRepository implements ISeatRepository {
	constructor(private prisma: PrismaService) {}

	async findOne(seatId: number): Promise<Seat> {
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

	async update(seat: Seat): Promise<Seat> {
		const entity = await this.prisma.seatEntity.update({
			where: {
				id: seat.id,
			},
			data: {
				status: seat.status,
				price: seat.price,
			},
		});
		return new Seat(entity);
	}

	async create(seat: Seat): Promise<Seat> {
		const entity = await this.prisma.seatEntity.create({
			data: seat,
		});
		return new Seat(entity);
	}
}
