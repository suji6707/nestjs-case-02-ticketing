import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
	private client: Redis;

	onModuleInit(): Promise<void> {
		this.client = new Redis({
			host: process.env.REDIS_HOST,
			port: Number(process.env.REDIS_PORT),
		});
		return;
	}

	onModuleDestroy(): Promise<void> {
		this.client.quit();
		return;
	}

	set(key: string, value: string, ttl?: number): Promise<string> {
		return this.client.set(key, value, 'EX', ttl);
	}

	get(key: string): Promise<string | null> {
		return this.client.get(key);
	}

	delete(key: string): Promise<number> {
		return this.client.del(key);
	}

	eval(script: string, keys: string[], args: string[]): Promise<any> {
		return this.client.eval(script, keys.length, ...keys, ...args);
	}
}
