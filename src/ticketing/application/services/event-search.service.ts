import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { RedisService } from 'src/common/services/redis/redis.service';
import {
	SCHEDULES_CACHE_TTL,
	SEATS_CACHE_TTL,
} from 'src/common/utils/constants';
import {
	getSchedulesCacheKey,
	getSeatsCacheKey,
} from 'src/common/utils/redis-keys';
import {
	ConcertSchduleResponseDto,
	ConcertSeatResponseDto,
} from '../../controllers/dtos/response.dto';
import { Concert } from '../domain/models/concert';
import { Seat } from '../domain/models/seat';
import { TokenStatus } from '../domain/models/token';
import { IConcertRepository } from '../domain/repositories/iconcert.repository';
import { QueueTokenService } from './queue-token.service';

@Injectable()
export class EventSearchService {
	constructor(
		@Inject('IConcertRepository')
		private readonly concertRepository: IConcertRepository,
		@Inject('QueueTokenService')
		private readonly tokenService: QueueTokenService,
		private readonly redisService: RedisService,
	) {}

	async getConcerts(): Promise<Concert[]> {
		return this.concertRepository.findConcerts();
	}

	async getSchedules(
		userId: number,
		concertId: number,
		queueToken: string,
	): Promise<ConcertSchduleResponseDto> {
		const isValidToken = await this.tokenService.verifyToken(
			userId,
			queueToken,
			TokenStatus.PROCESSING,
		);
		if (!isValidToken) {
			throw new BadRequestException('Invalid token');
		}

		// internal cache
		const cacheKey = getSchedulesCacheKey(concertId);
		const cached = await this.redisService.get(cacheKey);
		if (cached) {
			return {
				schedules: cached,
			};
		}

		const schedules = await this.concertRepository.findSchedules(concertId);
		const result = schedules.map((schedule) => ({
			id: schedule.id,
			basePrice: schedule.basePrice,
			startTime: schedule.startAt,
			endTime: schedule.endAt,
			isSoldOut: schedule.isSoldOut,
		}));

		// set cache
		await this.redisService.set(cacheKey, result, SCHEDULES_CACHE_TTL);

		return {
			schedules: result,
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
			TokenStatus.PROCESSING,
		);
		if (!isValidToken) {
			throw new BadRequestException('Invalid token');
		}

		const cacheKey = getSeatsCacheKey(scheduleId);
		const cached = await this.redisService.hgetall(cacheKey);
		if (cached) {
			return {
				seats: cached,
			};
		}

		const seats = await this.concertRepository.findSeats(scheduleId);
		const seatMap = new Map<
			number,
			{ className: string; price: number; status: number }
		>();
		for (const seat of seats) {
			seatMap.set(Number(seat.id), {
				className: seat.className,
				price: seat.price,
				status: seat.status,
			});
		}

		// set cache
		await this.redisService.hset(
			getSeatsCacheKey(scheduleId),
			seatMap,
			SEATS_CACHE_TTL,
		);

		return {
			seats: Object.fromEntries(seatMap),
		};
	}
}
