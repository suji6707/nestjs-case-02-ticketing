import { Injectable } from '@nestjs/common';
import { OnModuleDestroy } from '@nestjs/common';
import { Job, JobsOptions, Queue } from 'bullmq';
import IORedis from 'ioredis';
import { RedisService } from 'src/common/services/redis/redis.service';

@Injectable()
export class QueueProducer implements OnModuleDestroy {
	private readonly connection: IORedis;
	private readonly queues = new Map<string, Queue>();

	constructor(private readonly redisService: RedisService) {
		this.connection = this.redisService.client;
	}

	async onModuleDestroy(): Promise<void> {
		for (const queue of this.queues.values()) {
			await queue.close();
		}
		this.queues.clear();

		console.log('redis connection status 1:', this.connection.status);

		if (this.connection.status !== 'end') {
			await this.connection.quit().catch((err) => {
				console.log('QueueProducer OnDestroy Error', err);
			});
		}

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

	async getJob(queueName: string, jobId: string): Promise<Job> {
		const queue = this.getOrCreateQueue(queueName);
		const job = (await queue.getJob(jobId)) as Job;
		if (!job) {
			throw new Error(`Job ${jobId} not found in queue ${queueName}`);
		}
		return job;
	}
}
