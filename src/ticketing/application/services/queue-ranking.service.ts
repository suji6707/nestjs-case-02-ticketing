import {
	BadRequestException,
	Inject,
	Injectable,
	Logger,
} from '@nestjs/common';
import { RedisService } from 'src/common/services/redis/redis.service';
import {
	activeQueueKey,
	getBookedCountKey,
	getDurationKey,
	getFastSelloutRankingKey,
	getSellingStartTimeKey,
	getTotalSeatsCountKey,
	maxActiveUsersCountKey,
	maxActiveUsersKey,
	waitingQueueKey,
} from 'src/common/utils/redis-keys';
import {
	FastSelloutRankingItem,
	FastSelloutRankingResponseDto,
} from 'src/ticketing/controllers/dtos/response.dto';
import { IConcertRepository } from '../domain/repositories/iconcert.repository';

@Injectable()
export class QueueRankingService {
	private readonly logger = new Logger(QueueRankingService.name);

	constructor(private readonly redisService: RedisService) {}

	async initialize(): Promise<void> {
		await this.redisService.delete(waitingQueueKey());
		await this.redisService.delete(activeQueueKey());
		await this.redisService.set(maxActiveUsersKey(), 10); // 동시접속 10명
	}

	/**
	 * create token 요청
	 * - zadd waitQueue timestamp token
	 */
	async addToWaitingQueue(queueToken: string): Promise<void> {
		try {
			await this.redisService.zadd(waitingQueueKey(), Date.now(), queueToken);
		} catch (error) {
			this.logger.error(error);
			throw new Error('FAILED_TO_UPDATE_RANKING');
		}
	}

	/**
	 * Queue 업데이트: max count만큼 찰 때까지 waiting -> active로 전환
	 */
	async updateEntireQueue(): Promise<void> {
		const maxCount = Number(
			await this.redisService.get(maxActiveUsersCountKey()),
		);
		let activeCount = Number(await this.redisService.zcard(activeQueueKey()));
		let waitingCount = Number(await this.redisService.zcard(waitingQueueKey()));
		while (activeCount < maxCount && waitingCount > 0) {
			// waiting queue의 1순위를 active queue로 전환
			const token = await this.redisService.zrange(waitingQueueKey(), 0, 0)[0];
			this.logger.log('1st rank token: ', token.slice(0, 10));
			await this.redisService.zrem(waitingQueueKey(), token);
			await this.redisService.zadd(activeQueueKey(), Date.now(), token);
			// update count
			activeCount = Number(await this.redisService.zcard(activeQueueKey()));
			waitingCount = Number(await this.redisService.zcard(waitingQueueKey()));
		}
	}

	/** 대기 순번 확인 폴링시 호출
	 * 	- 토큰이 waitingQueue에 있으면 남은 대기순번 반환
	 * 	- 토큰이 activeQueue에 있으면 남은 예약시간 반환
	 */
	async checkQueueStatus(
		token: string,
	): Promise<{ waitingRank: number; activeRemainTime: number }> {
		const result = {
			waitingRank: -1,
			activeRemainTime: -1,
		};

		const waitingScore = await this.redisService.zscore(
			waitingQueueKey(),
			token,
		);
		if (waitingScore !== -1) {
			// 남은 대기순번 확인
			const rank = await this.redisService.zrank(waitingQueueKey(), token);
			result.waitingRank = rank;
			return result;
		}
		const activeScore = await this.redisService.zscore(activeQueueKey(), token); // activeQueue로 전환된 시점 timestamp
		if (activeScore !== -1) {
			// 남은 예약시간 확인(제한 3분)
			const expireTime = activeScore + 180000; // 1000 * 60 * 3
			const remainingTime = expireTime - Date.now();
			if (remainingTime > 0) {
				result.activeRemainTime = remainingTime;
				return result;
			}
		}
		// 둘 다 없으면 권한 X
		return result;
	}
}
