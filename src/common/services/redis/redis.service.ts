import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { Redis } from 'ioredis';
import { REDIS_CLIENT } from 'src/common/utils/constants';

@Injectable()
export class RedisService implements OnModuleDestroy {
	constructor(@Inject(REDIS_CLIENT) readonly client: Redis) {}

	async onModuleDestroy(): Promise<void> {
		console.log('redis connection status 2:', this.client.status);

		if (this.client.status !== 'end') {
			await this.client.quit().catch((err) => {
				console.log('RedisService OnDestroy Error', err);
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
