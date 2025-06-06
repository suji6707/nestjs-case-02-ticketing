import { Injectable } from '@nestjs/common';
import { Job, JobsOptions, Queue } from 'bullmq';
import IORedis from 'ioredis';

@Injectable()
export class QueueProducer {
	private readonly connection: IORedis;
	private readonly queues: Map<string, Queue>;

	constructor() {
		this.connection = new IORedis({
			host: process.env.REDIS_HOST,
			port: Number(process.env.REDIS_PORT),
		});
		this.queues = new Map<string, Queue>();
	}

	private getOrCreateQueue(name: string): Queue {
		if (this.queues.has(name)) {
			return this.queues.get(name);
		}
		const queue = new Queue(name, {
			connection: this.connection,
		});
		this.queues.set(name, queue);

		// TODO: Redis set으로 등록된 큐 공유

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
