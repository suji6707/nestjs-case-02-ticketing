import { Injectable } from '@nestjs/common';
import { OnModuleDestroy } from '@nestjs/common';
import { Job, JobsOptions, Queue } from 'bullmq';
import IORedis from 'ioredis';
import { RedisService } from 'src/common/services/redis/redis.service';

@Injectable()
export class QueueProducer implements OnModuleDestroy {
	private connection: IORedis;
	private readonly queues = new Map<string, Queue>();

	constructor(
		private readonly redisService: RedisService,
		connection?: IORedis,
	) {
		if (connection) {
			this.connection = connection;
		} else {
			this.connection = new IORedis({
				host: process.env.REDIS_HOST,
				port: Number(process.env.REDIS_PORT),
			});
		}
	}

	async onModuleDestroy(): Promise<void> {
		for (const queue of this.queues.values()) {
			await queue.close();
		}
		this.queues.clear();

		// 에러 출력
		await this.connection.quit().catch((err) => {
			console.error('Failed to quit Redis connection', err);
		});

		return;
	}

	private getOrCreateQueue(name: string): Queue {
		if (this.queues.has(name)) {
			return this.queues.get(name);
		}
		const queue = new Queue(name, {
			connection: this.connection,
		});
		this.queues.set(name, queue);

		this.redisService.setAdd('queues-shared', [name]);

		return queue;
	}

	async addJob(name: string, data: any, opts?: JobsOptions): Promise<Job> {
		const queue = this.getOrCreateQueue(name);
		const options = {
			...opts,
			removeOnComplete: true,
			removeOnFail: true,
		};
		return queue.add(name, data, options);
	}
}
