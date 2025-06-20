import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/services/prisma.service';
import { Concert } from 'src/ticketing/application/domain/models/concert';
import { ConcertSchedule } from 'src/ticketing/application/domain/models/concert-schedule';
import { Seat } from 'src/ticketing/application/domain/models/seat';
import { IConcertRepository } from 'src/ticketing/application/domain/repositories/iconcert.repository';

@Injectable()
export class ConcertPrismaRepository implements IConcertRepository {
	constructor(
		private readonly txHost: TransactionHost<TransactionalAdapterPrisma>,
	) {}

	async findConcerts(): Promise<Concert[]> {
		const entities = await this.txHost.tx.concertEntity.findMany();
		return entities.map((entity) => new Concert(entity));
	}

	async findSchedules(concertId: number): Promise<ConcertSchedule[]> {
		const entities = await this.txHost.tx.concertScheduleEntity.findMany({
			where: {
				concertId,
			},
		});
		return entities.map((entity) => new ConcertSchedule(entity));
	}

	async findSeats(scheduleId: number): Promise<Seat[]> {
		const entities = await this.txHost.tx.seatEntity.findMany({
			where: {
				scheduleId,
			},
		});
		return entities.map((entity) => new Seat(entity));
	}

	async createConcert(concert: Concert): Promise<Concert> {
		const entity = await this.txHost.tx.concertEntity.create({
			data: concert,
		});
		return new Concert(entity);
	}

	async createSchedule(schedule: ConcertSchedule): Promise<ConcertSchedule> {
		const entity = await this.txHost.tx.concertScheduleEntity.create({
			data: schedule,
		});
		return new ConcertSchedule(entity);
	}
}
