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

	// sorted set ============================================================
	async zadd(key: string, score: number, member: string): Promise<number> {
		return this.client.zadd(key, score, member);
	}

	async zrem(key: string, member: string): Promise<number> {
		return this.client.zrem(key, member);
	}

	async zrange(
		key: string,
		start: number,
		stop: number,
		withScores?: boolean,
	): Promise<string[]> {
		const options: string[] = [];
		if (withScores) {
			options.push('WITHSCORES');
		}
		return this.client.zrange(key, start, stop, ...(options as any));
	}

	async increment(key: string): Promise<number> {
		return this.client.incr(key);
	}

	async zcard(key: string): Promise<number> {
		return this.client.zcard(key);
	}

	async zscore(key: string, member: string): Promise<number> {
		const score = await this.client.zscore(key, member);
		if (score === null) {
			return -1;
		}
		return Number(score);
	}

	async zrank(key: string, member: string): Promise<number> {
		const rank = await this.client.zrank(key, member);
		if (rank === null) {
			return -1;
		}
		return Number(rank);
	}

	// string ============================================================
	async set(
		key: string,
		value: any,
		ttl?: number,
		nx?: boolean,
	): Promise<boolean> {
		try {
			const valueStr =
				typeof value === 'object' ? JSON.stringify(value) : value;

			const options: string[] = [];
			if (ttl) {
				options.push('EX', ttl.toString());
			}
			if (nx) {
				options.push('NX');
			}
			const result = await this.client.set(key, valueStr, ...(options as any));
			if (result !== 'OK') {
				throw new Error(`Failed to set key: ${key}`);
			}
			return true;
		} catch (error) {
			this.logger.error(error);
			throw new Error(`Failed to set key: ${key}`);
		}
	}

	// hash map ============================================================
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
				throw new Error(`Failed to set key: ${key}`);
			}
			if (ttl) {
				await this.client.expire(key, ttl);
			}
			return true;
		} catch (error) {
			this.logger.error(error);
			throw new Error(`Failed to set key: ${key}`);
		}
	}

	async hsetField(
		key: string,
		obj: Record<string, any>,
		onlyIfExist = true,
	): Promise<boolean> {
		try {
			// 해시맵이 있을 때만 업데이트
			if (onlyIfExist) {
				const exists = await this.client.exists(key);
				if (!exists) {
					return false;
				}
			}
			const query = this._buildHsetQuery(key, obj);
			const result = await this.client.hset(query[0], ...query.slice(1));
			if (result === 0) {
				throw new Error(`Failed to set key: ${key}`);
			}
			return true;
		} catch (error) {
			this.logger.error(error);
			throw new Error(`Failed to set key: ${key}`);
		}
	}

	_buildHsetQuery(key: string, obj: Record<string, any>): string[] {
		const pairs = Object.entries(obj).map(([field, value]) => {
			const stringValue =
				typeof value === 'object' && value !== null
					? JSON.stringify(value)
					: String(value);
			return [field, stringValue];
		});
		const query = pairs.flat();
		query.unshift(key);
		return query;
	}

	private _parseValue(value: string): any {
		try {
			return JSON.parse(value);
		} catch (error) {
			// not an object
			return value;
		}
	}

	async get(key: string): Promise<any> {
		const result = await this.client.get(key);
		if (!result) {
			this.logger.warn(`Cache MISS: ${key}`);
			return null;
		}
		return this._parseValue(result);
	}

	async hgetall(key: string): Promise<Record<string, any>> {
		try {
			const result = await this.client.hgetall(key);
			if (Object.keys(result).length === 0) {
				this.logger.warn(`Cache MISS: ${key}`);
				return null;
			}
			const parsedResult: Record<string, any> = {};
			for (const [field, value] of Object.entries(result)) {
				parsedResult[field] = this._parseValue(value);
			}
			return parsedResult;
		} catch (error) {
			this.logger.error(`Failed to get key: ${key}`, error);
			return null;
		}
	}

	async delete(...keys: string[]): Promise<boolean> {
		console.log('delete keys', keys);
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
