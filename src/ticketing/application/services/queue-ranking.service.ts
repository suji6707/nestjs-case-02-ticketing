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
	 * 🔄 대기열 큐 전체 업데이트
	 * 분산락으로 동시성 제어하되, 락 범위를 최소화하여 성능 최적화
	 */
	async updateEntireQueue(): Promise<void> {
		// 🎯 락 외부에서 상태 확인 (읽기 작업)
		const maxCount = Number(
			await this.redisService.get(maxActiveUsersCountKey()),
		);
		const activeCount = Number(await this.redisService.zcard(activeQueueKey()));
		const waitingCount = Number(
			await this.redisService.zcard(waitingQueueKey()),
		);

		// 이동 가능한 사용자 수 미리 계산
		const moveableCount = Math.min(maxCount - activeCount, waitingCount);
		if (moveableCount <= 0) {
			return; // 이동할 사용자가 없으면 락 없이 조기 반환
		}

		// 🔒 실제 큐 조작만 락으로 보호 (쓰기 작업만)
		await this.distributedLockService.withLock(
			getQueueUpdateLockKey(),
			5000, // TTL을 5초 → 3초로 단축
			async () => {
				// 락 내부에서 다시 한번 상태 확인 (Double-checked locking)
				const currentActiveCount = Number(
					await this.redisService.zcard(activeQueueKey()),
				);
				const currentWaitingCount = Number(
					await this.redisService.zcard(waitingQueueKey()),
				);

				const actualMoveableCount = Math.min(
					maxCount - currentActiveCount,
					currentWaitingCount,
				);

				// 배치로 한번에 처리하여 Redis 호출 횟수 최소화
				if (actualMoveableCount > 0) {
					// [token1, score1, token2, score2, ...]
					const tokensToMove = await this.redisService.zrange(
						waitingQueueKey(),
						0,
						actualMoveableCount - 1,
						false,
					);
					console.log('tokensToMove', tokensToMove);

					if (tokensToMove.length > 0) {
						// 배치 처리: Pipeline 사용
						const pipeline = this.redisService.pipeline();

						for (let i = 0; i < tokensToMove.length; i++) {
							const token = tokensToMove[i];
							// Active queue에 추가
							pipeline.zadd(activeQueueKey(), Date.now(), token);
							// Waiting queue에서 제거
							pipeline.zrem(waitingQueueKey(), token);
						}

						await pipeline.exec();

						this.logger.log(
							`✅ Moved ${actualMoveableCount} users from waiting to active queue`,
						);
					}
				}
			},
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
