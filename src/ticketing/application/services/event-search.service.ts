import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import {
	ConcertSchduleResponseDto,
	ConcertSeatResponseDto,
} from '../../controllers/dtos/response.dto';
import { Concert } from '../domain/models/concert';
import { TokenPurpose } from '../domain/models/token';
import { IConcertRepository } from '../domain/repositories/iconcert.repository';
import { TokenService } from './token.service';

@Injectable()
export class EventSearchService {
	constructor(
		@Inject('IConcertRepository')
		private readonly concertRepository: IConcertRepository,
		private readonly tokenService: TokenService,
	) {}

	async getConcerts(): Promise<Concert[]> {
		return this.concertRepository.findAllConcerts();
	}

	async getSchedules(
		userId: number,
		concertId: number,
		queueToken: string,
	): Promise<ConcertSchduleResponseDto> {
		const isValidToken = await this.tokenService.verifyToken(
			userId,
			queueToken,
			TokenPurpose.QUEUE_ENTRY,
		);
		if (!isValidToken) {
			throw new BadRequestException('Invalid token');
		}

		const schedules = await this.concertRepository.findSchedules(concertId);
		return {
			schedules: schedules.map((schedule) => ({
				id: schedule.id,
				basePrice: schedule.basePrice,
				startTime: schedule.startAt,
				endTime: schedule.endAt,
				isSoldOut: schedule.isSoldOut,
			})),
		};
	}

	async getSeats(
		userId: number,
		scheduleId: number,
		queueToken: string,
	): Promise<ConcertSeatResponseDto> {
		const isValidToken = await this.tokenService.verifyToken(
			userId,
			queueToken,
			TokenPurpose.QUEUE_ENTRY,
		);
		if (!isValidToken) {
			throw new BadRequestException('Invalid token');
		}

		const seats = await this.concertRepository.findSeats(scheduleId);
		return {
			seats: seats.map((seat) => ({
				id: seat.id,
				number: seat.number,
				className: seat.className,
				price: seat.price,
				status: seat.status,
			})),
		};
	}
}
