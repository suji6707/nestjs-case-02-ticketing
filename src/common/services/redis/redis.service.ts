import {
	Inject,
	Injectable,
	Logger,
	OnApplicationShutdown,
} from '@nestjs/common';
import { Redis } from 'ioredis';
import { REDIS_CLIENT } from 'src/common/utils/constants';
import {
	convertMapToArray,
	convertObjectToArray,
} from 'src/common/utils/converter';

Redis.Command.setArgumentTransformer('hset', (args) => {
	if (args.length === 2) {
		if (args[1] instanceof Map) {
			return [args[0], ...convertMapToArray(args[1])];
		}
		if (args[1] instanceof Object) {
			return [args[0], ...convertObjectToArray(args[1])];
		}
	}
	return args;
});

@Injectable()
export class RedisService implements OnApplicationShutdown {
	private readonly logger = new Logger(RedisService.name);

	constructor(@Inject(REDIS_CLIENT) readonly client: Redis) {}

	async onApplicationShutdown(): Promise<void> {
		console.log('redis connection status 2:', this.client.status);

		if (this.client.status !== 'end') {
			await this.client.quit().catch((err) => {
				this.logger.error('RedisService OnDestroy Error', err);
			});
		}

		return;
	}

	getConnection(): Redis {
		return this.client;
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
				this.logger.error(`Failed to set key: ${key}`);
				return false;
			}
			return true;
		} catch (error) {
			this.logger.error(`Failed to set key: ${key}`, error);
			return false;
		}
	}

	async hset(
		key: string,
		data: Map<string | number, any> | Record<string | number, any>,
		ttl?: number,
	): Promise<boolean> {
		try {
			const stringifiedValue = new Map<string | number, string>();
			const entries =
				data instanceof Map ? data.entries() : Object.entries(data);

			for (const [field, value] of entries) {
				const stringValue =
					typeof value === 'object' && value !== null
						? JSON.stringify(value)
						: String(value);
				stringifiedValue.set(field, stringValue);
			}

			const result = await this.client.hset(key, stringifiedValue);
			if (result === 0) {
				this.logger.error(`Failed to set key: ${key}`);
				return false;
			}
			if (ttl) {
				await this.client.expire(key, ttl);
			}
			return true;
		} catch (error) {
			this.logger.error(`Failed to set key: ${key}`, error);
			return false;
		}
	}

	async get(key: string): Promise<string | null> {
		return this.client.get(key);
	}

	async hgetall(key: string): Promise<Record<string, any>> {
		try {
			const result = await this.client.hgetall(key);
			const parsedResult: Record<string, any> = {};
			for (const [field, value] of Object.entries(result)) {
				parsedResult[field] = JSON.parse(value);
			}
			return parsedResult;
		} catch (error) {
			this.logger.error(`Failed to get key: ${key}`, error);
			return null;
		}
	}

	async delete(...keys: string[]): Promise<boolean> {
		await this.client.del(...keys);
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

	async flushDb(): Promise<boolean> {
		const result = await this.client.flushdb();
		return result === 'OK';
	}
}
