import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/services/prisma.service';
import { Concert } from 'src/ticketing/application/domain/models/concert';
import { ConcertSchedule } from 'src/ticketing/application/domain/models/concert-schedule';
import { Seat } from 'src/ticketing/application/domain/models/seat';
import { IConcertRepository } from 'src/ticketing/application/domain/repositories/iconcert.repository';

@Injectable()
export class ConcertPrismaRepository implements IConcertRepository {
	constructor(private prisma: PrismaService) {}

	async findAllConcerts(): Promise<Concert[]> {
		const rows = await this.prisma.concertEntity.findMany();
		return rows.map((row) => new Concert(row));
	}

	async findSchedules(concertId: number): Promise<ConcertSchedule[]> {
		const rows = await this.prisma.concertScheduleEntity.findMany({
			where: {
				concertId,
			},
		});
		return rows.map((row) => new ConcertSchedule(row));
	}

	async findSeats(scheduleId: number): Promise<Seat[]> {
		const rows = await this.prisma.seatEntity.findMany({
			where: {
				scheduleId,
			},
		});
		return rows.map((row) => new Seat(row));
	}
}
