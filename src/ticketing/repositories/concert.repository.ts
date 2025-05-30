import { Injectable } from '@nestjs/common';
import { Concert } from '@prisma/client';
import { PrismaService } from '../../common/services/prisma.service';
import { ConcertSchduleResponseDto } from '../controllers/dtos/response.dto';

@Injectable()
export class ConcertRepository {
	constructor(private prisma: PrismaService) {}

	async findAll(): Promise<Concert[]> {
		return this.prisma.concert.findMany();
	}

	async findSchedules(userId: number, concertId: number): Promise<ConcertSchduleResponseDto> {
		// TODO: 대기열 토큰 검증

		const schedules = await this.prisma.concertSchedule.findMany({
			where: {
				concertId,
			},
		});
		return {
			schedules: schedules.map((schedule) => ({
				id: schedule.id,
				concertId: schedule.concertId,
				basePrice: schedule.basePrice,
				startTime: schedule.startAt,
				endTime: schedule.endAt,
			})),
		};
	}

	
}
