import { Injectable } from '@nestjs/common';
import { Concert, ConcertSchedule, Seat } from '@prisma/client';
import { PrismaService } from '../../common/services/prisma.service';

@Injectable()
export class ConcertRepository {
	constructor(private prisma: PrismaService) {}

	async findAll(): Promise<Concert[]> {
		return this.prisma.concert.findMany();
	}

	async findSchedules(concertId: number): Promise<ConcertSchedule[]> {
		return this.prisma.concertSchedule.findMany({
			where: {
				concertId,
			},
		});
	}

	async findSeats(scheduleId: number): Promise<Seat[]> {
		return this.prisma.seat.findMany({
			where: {
				scheduleId,
			},
		});
	}
}
