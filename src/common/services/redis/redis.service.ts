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

	async set(
		key: string,
		value: string,
		ttl?: number,
		nx?: boolean,
	): Promise<boolean> {
		const result = await this.client.set(
			key,
			value,
			'EX',
			ttl,
			nx ? 'NX' : undefined,
		);
		if (result !== 'OK') {
			throw new Error(`Failed to acquire lock: ${key}`);
		}
		return true;
	}

	async get(key: string): Promise<string | null> {
		return this.client.get(key);
	}

	async delete(key: string): Promise<number> {
		return this.client.del(key);
	}

	async eval(script: string, keys: string[], args: string[]): Promise<any> {
		return this.client.eval(script, keys.length, ...keys, ...args);
	}
}
