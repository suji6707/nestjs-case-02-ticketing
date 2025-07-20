import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { IDistributedLockService } from 'src/common/interfaces/idistributed-lock.service';
import { RedisService } from 'src/common/services/redis/redis.service';
import { DISTRIBUTED_LOCK_SERVICE } from 'src/common/utils/constants';
import {
	activeQueueKey,
	getQueueUpdateLockKey,
	maxActiveUsersCountKey,
	waitingQueueKey,
} from 'src/common/utils/redis-keys';

@Injectable()
export class QueueRankingService implements OnModuleInit {
	private readonly logger = new Logger(QueueRankingService.name);

	constructor(
		private readonly redisService: RedisService,
		@Inject(DISTRIBUTED_LOCK_SERVICE)
		private readonly distributedLockService: IDistributedLockService,
	) {}

	async onModuleInit(): Promise<void> {
		await this.initialize();
	}

	async initialize(): Promise<void> {
		await this.redisService.delete(waitingQueueKey());
		await this.redisService.delete(activeQueueKey());
		await this.redisService.set(maxActiveUsersCountKey(), 10); // 동시접속 10명
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
	 * 🔒 분산락으로 동시성 제어
	 */
	async updateEntireQueue(): Promise<void> {
		// 🔒 큐 업데이트 분산락 적용
		await this.distributedLockService.withLock(
			getQueueUpdateLockKey(),
			5000, // 5초 TTL
			async () => {
				const maxCount = Number(
					await this.redisService.get(maxActiveUsersCountKey()),
				);
				let activeCount = Number(
					await this.redisService.zcard(activeQueueKey()),
				);
				let waitingCount = Number(
					await this.redisService.zcard(waitingQueueKey()),
				);

				while (activeCount < maxCount && waitingCount > 0) {
					// waiting queue의 1순위를 active queue로 전환
					const token = (
						await this.redisService.zrange(waitingQueueKey(), 0, 0)
					)[0];
					console.log('1st rank token: ', token?.slice(-10));
					await this.redisService.zrem(waitingQueueKey(), token);
					await this.redisService.zadd(activeQueueKey(), Date.now(), token);
					// update count
					activeCount = Number(await this.redisService.zcard(activeQueueKey()));
					waitingCount = Number(
						await this.redisService.zcard(waitingQueueKey()),
					);
				}
			},
			3, // 최대 3회 재시도
		);
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

	async deleteFromWaitingQueue(token: string): Promise<number> {
		return this.redisService.zrem(waitingQueueKey(), token);
	}

	async deleteFromActiveQueue(token: string): Promise<number> {
		return this.redisService.zrem(activeQueueKey(), token);
	}

	async _showQueues(): Promise<void> {
		const waitingQueue = await this.redisService.zrange(
			waitingQueueKey(),
			0,
			-1,
			true,
		);
		const activeQueue = await this.redisService.zrange(
			activeQueueKey(),
			0,
			-1,
			true,
		);
		console.log('waitingQueue', waitingQueue);
		console.log('activeQueue', activeQueue);
	}
}
