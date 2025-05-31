import { Injectable } from '@nestjs/common';
import { Concert } from '@prisma/client';
import { ConcertRepository } from '../repositories/concert.repository';
import { ConcertSchduleResponseDto, ConcertSeatResponseDto } from '../controllers/dtos/response.dto';

@Injectable()
export class EventSearchService {
	constructor(private readonly concertRepository: ConcertRepository) {}

	async getConcerts(): Promise<Concert[]> {
		return this.concertRepository.findAll();
	}

	async getSchedules(userId: number, concertId: number, queueToken: string): Promise<ConcertSchduleResponseDto> {
		// TODO 토큰 검증

		const schedules = await this.concertRepository.findSchedules(concertId);
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

	async getSeats(userId: number, scheduleId: number, queueToken: string): Promise<ConcertSeatResponseDto> {
		// TODO 토큰 검증
		
		const seats = await this.concertRepository.findSeats(scheduleId);
		return {
			seats: seats.map((seat) => ({
				id: seat.id,
				number: seat.number,
				class: seat.class,
				price: seat.price,
				status: seat.status,
			})),
		};
	}
}
