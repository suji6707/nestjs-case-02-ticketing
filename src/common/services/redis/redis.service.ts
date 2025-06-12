import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
	private client: Redis;
	private _isManagedExternally = false;

	constructor(client?: Redis) {
		if (client) {
			this.client = client;
			this._isManagedExternally = true;
		}
	}

	onModuleInit(): void {
		if (!this.client)
			this.client = new Redis({
				host: process.env.REDIS_HOST,
				port: Number(process.env.REDIS_PORT),
			});
		return;
	}

	async onModuleDestroy(): Promise<void> {
		console.log('is managed externally 2:', this._isManagedExternally);
		console.log('redis connection status 2:', this.client.status);

		if (this.client.status !== 'end') {
			await this.client.quit().catch((err) => {
				console.error('RedisService OnDestroy Error', err);
			});
		}

		return;
	}

	async set(
		key: string,
		value: string,
		ttl?: number,
		nx?: boolean,
	): Promise<boolean> {
		try {
			let result: string;
			if (ttl && nx) {
				result = await this.client.set(key, value, 'EX', ttl, 'NX');
			} else if (ttl) {
				result = await this.client.set(key, value, 'EX', ttl);
			} else if (nx) {
				result = await this.client.set(key, value, 'NX');
			} else {
				result = await this.client.set(key, value);
			}

			if (result !== 'OK') {
				throw new Error(`Failed to set key: ${key}`);
			}
			return true;
		} catch (error) {
			console.error(`Failed to set key: ${key}`, error);
			return false;
		}
	}

	async get(key: string): Promise<string | null> {
		return this.client.get(key);
	}

	async delete(key: string): Promise<boolean> {
		await this.client.del(key);
		return true;
	}

	async eval(script: string, keys: string[], args: string[]): Promise<any> {
		return this.client.eval(script, keys.length, ...keys, ...args);
	}

	async setAdd(key: string, values: string[]): Promise<number> {
		return this.client.sadd(key, ...values);
	}

	async setRemove(key: string, values: string[]): Promise<number> {
		return this.client.srem(key, ...values);
	}

	async getSet(key: string): Promise<string[]> {
		return this.client.smembers(key);
	}

	async getTtl(key: string): Promise<number> {
		return this.client.ttl(key);
	}
}
