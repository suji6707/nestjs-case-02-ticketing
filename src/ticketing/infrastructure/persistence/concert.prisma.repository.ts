import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/services/prisma.service';
import { Concert } from 'src/ticketing/application/domain/models/concert';
import { ConcertSchedule } from 'src/ticketing/application/domain/models/concert-schedule';
import { Seat } from 'src/ticketing/application/domain/models/seat';
import { IConcertRepository } from 'src/ticketing/application/domain/repositories/iconcert.repository';

@Injectable()
export class ConcertPrismaRepository implements IConcertRepository {
	constructor(private prisma: PrismaService) {}

	async findConcerts(): Promise<Concert[]> {
		const entities = await this.prisma.concertEntity.findMany();
		return entities.map((entity) => new Concert(entity));
	}

	async findSchedules(concertId: number): Promise<ConcertSchedule[]> {
		const entities = await this.prisma.concertScheduleEntity.findMany({
			where: {
				concertId,
			},
		});
		return entities.map((entity) => new ConcertSchedule(entity));
	}

	async findSeats(scheduleId: number): Promise<Seat[]> {
		const entities = await this.prisma.seatEntity.findMany({
			where: {
				scheduleId,
			},
		});
		return entities.map((entity) => new Seat(entity));
	}
}
