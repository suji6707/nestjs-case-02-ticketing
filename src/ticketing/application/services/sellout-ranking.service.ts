import {
	BadRequestException,
	Inject,
	Injectable,
	Logger,
} from '@nestjs/common';
import { RedisService } from 'src/common/services/redis/redis.service';
import {
	getBookedCountKey,
	getDurationKey,
	getFastSelloutRankingKey,
	getSellingStartTimeKey,
	getTotalSeatsCountKey,
} from 'src/common/utils/redis-keys';
import {
	FastSelloutRankingItem,
	FastSelloutRankingResponseDto,
} from 'src/ticketing/controllers/dtos/response.dto';
import { IConcertRepository } from '../domain/repositories/iconcert.repository';

@Injectable()
export class SelloutRankingService {
	private readonly logger = new Logger(SelloutRankingService.name);

	constructor(
		@Inject('IConcertRepository')
		private readonly concertRepository: IConcertRepository,
		private readonly redisService: RedisService,
	) {}

	// Admin 기능
	async startToSell(scheduleIds: number[]): Promise<boolean> {
		const schedules =
			await this.concertRepository.findManySchedules(scheduleIds);
		if (schedules.length === 0) {
			throw new BadRequestException('Schedule not found');
		}

		// 모든 schedule에 대해 redis에 booked, seats, sellingStartTime key를 set
		for (const schedule of schedules) {
			const scheduleId = schedule.id;
			const seatsCountKey = getTotalSeatsCountKey(scheduleId);
			const bookedCountKey = getBookedCountKey(scheduleId);
			const sellingStartTimeKey = getSellingStartTimeKey(scheduleId);

			await this.redisService.set(seatsCountKey, schedule.totalSeats);
			await this.redisService.set(bookedCountKey, 0);
			await this.redisService.set(
				sellingStartTimeKey,
				schedule.startAt.getTime(),
			);
		}
		return true;
	}

	async updateRanking(scheduleId: number): Promise<void> {
		try {
			const seatsCountKey = getTotalSeatsCountKey(scheduleId);
			const bookedCountKey = getBookedCountKey(scheduleId);
			const sellingStartTimeKey = getSellingStartTimeKey(scheduleId);

			await this.redisService.increment(bookedCountKey);

			const bookedCount = await this.redisService.get(bookedCountKey);
			const seatsCount = await this.redisService.get(seatsCountKey);
			if (Number(bookedCount) >= Number(seatsCount)) {
				const duration =
					Date.now() - Number(await this.redisService.get(sellingStartTimeKey));
				await this.redisService.zadd(
					getFastSelloutRankingKey(),
					duration,
					getDurationKey(scheduleId),
				);
			}
		} catch (error) {
			this.logger.error(error);
			throw new Error('FAILED_TO_UPDATE_RANKING');
		}
	}

	async getFastSelloutRanking(): Promise<FastSelloutRankingResponseDto> {
		const ranking = await this.redisService.zrange(
			getFastSelloutRankingKey(),
			0,
			-1,
			true,
		);
		console.log('ranking', ranking);

		const result: FastSelloutRankingItem[] = [];
		for (let i = 0; i < ranking.length; i += 2) {
			const key = ranking[i];
			const scheduleId = Number(key.split('schedule:')[1]);
			const duration = Number(ranking[i + 1]);

			const startTimeKey = getSellingStartTimeKey(scheduleId);
			const startTime = Number(await this.redisService.get(startTimeKey));
			const selloutTime = startTime + duration;
			const seatsCountKey = getTotalSeatsCountKey(scheduleId);
			const seatsCount = Number(await this.redisService.get(seatsCountKey));
			result.push({
				scheduleId,
				startTime: new Date(startTime),
				selloutTime: new Date(selloutTime),
				duration,
				seatsCount,
			});
		}
		console.log('result', result);

		return {
			ranking: result,
		};
	}
}
