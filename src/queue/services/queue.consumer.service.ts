import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { Job, Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { RedisService } from 'src/common/services/redis/redis.service';
import { RESERVATION_SESSION_TTL } from 'src/common/utils/constants';
import { TokenStatus } from 'src/ticketing/application/domain/models/token';

@Injectable()
export class QueueConsumer implements OnApplicationShutdown {
	private readonly logger = new Logger(QueueConsumer.name);
	private readonly connection: IORedis;
	private readonly queues = new Map<string, Queue>();
	private readonly activeWorkers = new Map<string, Worker>();

	constructor(private readonly redisService: RedisService) {
		this.connection = new IORedis({
			host: process.env.REDIS_HOST,
			port: Number(process.env.REDIS_PORT),
		});

		this.redisService.getSet('queues-shared').then((queues) => {
			for (const queue of queues) {
				this.getOrCreateQueue(queue);
			}
		});
	}

	private getOrCreateQueue(name: string): Queue {
		if (this.queues.has(name)) {
			return this.queues.get(name);
		}
		const queue = new Queue(name, {
			connection: this.connection,
		});
		this.queues.set(name, queue);
		return queue;
	}

	private _getQueueTokenCacheKey(token: string): string {
		return `token:queue:${token}`;
	}

	async process(job: Job<{ token: string }>): Promise<boolean> {
		const { token } = job.data;
		this.logger.log(
			`Processing job ${job.id} from queue ${job.queueName} with token: ${token}`,
		);
		const cacheKey = this._getQueueTokenCacheKey(token);
		await this.redisService.set(
			cacheKey,
			TokenStatus.PROCESSING,
			RESERVATION_SESSION_TTL + 1,
		);

		// 예약 세션 만료(3분)시 대기열 토큰 삭제
		setTimeout(() => {
			this.redisService.delete(cacheKey);
		}, RESERVATION_SESSION_TTL * 1000);

		return true;
	}

	async onApplicationShutdown(): Promise<void> {
		this.logger.log(
			'Closing all active workers due to application shutdown...',
		);
		const closePromises = [];
		for (const [queueName, worker] of this.activeWorkers) {
			this.logger.log(`Closing worker for queue ${queueName}...`);
			closePromises.push(worker.close());
		}
		await Promise.all(closePromises);
		this.logger.log('All active workers have been closed.');
	}
}
