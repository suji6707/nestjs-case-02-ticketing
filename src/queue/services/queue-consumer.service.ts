import {
	Injectable,
	Logger,
	OnApplicationShutdown,
	OnModuleDestroy,
} from '@nestjs/common';
import { Job, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { RedisService } from 'src/common/services/redis/redis.service';
import { RESERVATION_SESSION_TTL } from 'src/common/utils/constants';
import { getQueueTokenKey } from 'src/common/utils/redis-keys';
import { TokenStatus } from 'src/ticketing/application/domain/models/token';

@Injectable()
export class QueueConsumer implements OnModuleDestroy {
	private readonly logger = new Logger(QueueConsumer.name);
	private readonly queues: Set<string> = new Set();
	private readonly activeWorkers = new Map<string, Worker>();
	private activeTimers: Set<NodeJS.Timeout> = new Set();

	constructor(private readonly redisService: RedisService) {}

	async loadQueuesFromRedis(): Promise<void> {
		const queues = await this.redisService.getSet('queues-shared');
		for (const queue of queues) {
			this.queues.add(queue);
		}
	}

	async initializeAndStartWorkers(): Promise<void> {
		for (const queueName of this.queues) {
			// for every queues, create worker and start it
			const worker = new Worker(
				queueName,
				this.process.bind(this), // Worker의 process 메서드 내에서 this가 QueueConsumer 인스턴스를 참조하도록 함
				{
					connection: {
						...this.redisService.getConnection().options,
						maxRetriesPerRequest: null,
					},
					concurrency: 5,
					// autorun: false,
				},
			);
			// await worker.run();
			this.activeWorkers.set(queueName, worker);
		}
	}

	async process(job: Job<{ token: string }>): Promise<boolean> {
		const { token } = job.data;
		this.logger.log(
			`Processing job ${job.id} from queue ${job.queueName} with token: ${token}`,
		);
		const cacheKey = getQueueTokenKey(token);
		await this.redisService.set(
			cacheKey,
			TokenStatus.PROCESSING,
			RESERVATION_SESSION_TTL + 1,
		);

		// 예약 세션 만료(3분)시 대기열 토큰 삭제
		const timerId = setTimeout(() => {
			this.redisService
				.delete(cacheKey)
				.then(() => {
					this.logger.log(
						`[Timer] Successfully deleted cache key: ${cacheKey}`,
					);
				})
				.catch((err) => {
					this.logger.error(
						`[Timer] Failed to delete cache key ${cacheKey} after session expiry: ${err.message}`,
					);
				});
			this.activeTimers.delete(timerId);
		}, RESERVATION_SESSION_TTL * 1000);

		this.activeTimers.add(timerId);
		return true;
	}

	async onModuleDestroy(): Promise<void> {
		this.logger.log(
			'Closing all active workers due to application shutdown...',
		);

		for (const timerId of this.activeTimers) {
			clearTimeout(timerId);
		}

		const closePromises = [];
		for (const [queueName, worker] of this.activeWorkers) {
			if (worker) {
				this.logger.log(`Closing worker for queue ${queueName}...`);
				closePromises.push(worker.close());
			}
		}
		await Promise.all(closePromises);
		this.logger.log('All active workers have been closed.');
	}
}
