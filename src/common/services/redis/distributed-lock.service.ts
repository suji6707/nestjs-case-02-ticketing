import { Injectable } from '@nestjs/common';
import { IDistributedLockService } from 'src/common/interfaces/idistributed-lock.service';
import { RedisService } from 'src/common/services/redis/redis.service';

@Injectable()
export class DistributedLockService implements IDistributedLockService {
	private readonly lockPrefix = 'lock:';

	constructor(private readonly redisService: RedisService) {}

	async acquireLock(key: string, ttl: number): Promise<boolean> {
		const cacheKey = `${this.lockPrefix}${key}`;
		return await this.redisService
			.set(cacheKey, 'locked', ttl, true)
			.catch(() => false);
	}

	async releaseLock(key: string): Promise<boolean> {
		const cacheKey = `${this.lockPrefix}${key}`;
		return this.redisService.delete(cacheKey);
	}

	async withLock<T>(
		key: string,
		ttl: number,
		action: () => Promise<T>,
		maxRetry = 10,
		retryInterval = 100,
	): Promise<T> {
		let lockAcquired = false;
		for (let i = 0; i < maxRetry; i++) {
			lockAcquired = await this.acquireLock(key, ttl);
			if (lockAcquired) {
				break;
			}
			await new Promise((resolve) => setTimeout(resolve, retryInterval));
		}
		if (!lockAcquired) {
			throw new Error(
				`Failed to acquire lock for key: ${key} after ${maxRetry} retries`,
			);
		}
		try {
			// 비즈니스 로직 및 에러처리는 알지 못함 -> 쓰는 곳에서 try catch
			console.log(`[AcquireLock] ${key}`);
			return await action();
		} finally {
			console.log(`[ReleaseLock] ${key}`);
			await this.releaseLock(key);
		}
	}
}
