import { Injectable } from '@nestjs/common';
import { OnModuleDestroy } from '@nestjs/common';
import { Job, JobsOptions, Queue } from 'bullmq';
import IORedis from 'ioredis';
import { RedisService } from 'src/common/services/redis/redis.service';

@Injectable()
export class QueueProducer implements OnModuleDestroy {
	private connection: IORedis;
	private readonly queues = new Map<string, Queue>();
	private _isManagedExternally = false;

	constructor(
		private readonly redisService: RedisService,
		connection?: IORedis,
	) {
		if (connection) {
			this.connection = connection;
			this._isManagedExternally = true;
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

		console.log('redis connection status 1:', this.connection.status);
		console.log('is managed externally 1:', this._isManagedExternally);

		if (this._isManagedExternally && this.connection.status !== 'end') {
			await this.connection.quit().catch((err) => {
				console.error('QueueProducer OnDestroy Error', err);
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
}
