export interface IDistributedLockService {
	acquireLock(key: string, ttl: number): Promise<boolean>;
	releaseLock(key: string): Promise<boolean>;
	// action: 락이 활성화된 동안 실행할 비동기 작업(주로 트랜잭션)
	withLock<T>(
		key: string,
		ttl: number,
		action: () => Promise<T>,
		maxRetry?: number,
		retryInterval?: number,
	): Promise<T>;
}
