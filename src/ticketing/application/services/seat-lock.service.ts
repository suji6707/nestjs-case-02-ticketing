import { Injectable } from '@nestjs/common';
import { RedisService } from 'src/common/services/redis/redis.service';
import { SEAT_LOCK_TTL } from 'src/common/utils/constants';

@Injectable()
export class SeatLockService {
	constructor(private readonly redisService: RedisService) {}

	private _getLockKey(seatId: number): string {
		return `seat:${seatId}:lock`;
	}

	async isLocked(seatId: number): Promise<boolean> {
		const key = this._getLockKey(seatId);
		const result = await this.redisService.get(key);
		return !!result;
	}

	async lockSeat(seatId: number, queueToken: string): Promise<boolean> {
		const key = this._getLockKey(seatId);
		// set value as queueToken
		const result = await this.redisService
			.set(key, queueToken, SEAT_LOCK_TTL, true)
			.catch(() => false);
		return result;
	}

	async unlockSeat(seatId: number, lockValue: string): Promise<boolean> {
		const key = this._getLockKey(seatId);
		const luaScript = `
			if redis.call('get', KEYS[1]) == ARGV[1] then
				return redis.call('del', KEYS[1])
			else
				return 0
			end
		`;
		const result = await this.redisService.eval(luaScript, [key], [lockValue]);
		return result === 1;
	}
}
