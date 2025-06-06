import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

@Injectable()
export class QueueConsumer implements OnApplicationShutdown {
	private readonly connection: IORedis;
	private readonly queues: Map<string, Queue>;

	constructor() {
		this.connection = new IORedis({
			host: process.env.REDIS_HOST,
			port: Number(process.env.REDIS_PORT),
		});
		this.queues = new Map<string, Queue>();
	}
}
