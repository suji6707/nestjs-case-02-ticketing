import { Injectable } from '@nestjs/common';
import { Job, JobsOptions, Queue } from 'bullmq';
import IORedis from 'ioredis';
import { RedisService } from 'src/common/services/redis/redis.service';

@Injectable()
export class QueueProducer {
	private readonly connection: IORedis;
	private readonly queues = new Map<string, Queue>();

	constructor(private readonly redisService: RedisService) {
		this.connection = new IORedis({
			host: process.env.REDIS_HOST,
			port: Number(process.env.REDIS_PORT),
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
