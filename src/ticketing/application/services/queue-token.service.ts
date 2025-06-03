import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from 'src/auth/application/services/jwt.service';
import { RedisService } from 'src/common/services/redis/redis.service';
import { QUEUE_TOKEN_TTL } from 'src/common/utils/constants';
import { QueueTokenResponseDto } from '../../controllers/dtos/response.dto';
import { TokenPurpose, TokenStatus } from '../domain/models/token';
import {
	ICreateQueueTokenParams,
	ITokenService,
} from './interfaces/itoken.service';

@Injectable()
export class QueueTokenService implements ITokenService {
	private readonly logger = new Logger(QueueTokenService.name);

	constructor(
		private readonly redisService: RedisService,
		private readonly jwtService: JwtService,
	) {}

	private _getCacheKey(token: string): string {
		return `token:queue:${token}`;
	}

	/**
	 * TODO: 순번 진입시 status = PROCESSING 으로 바꾸어 재발급해야함.
	 * 해당 새 토큰을 value로 set lock
	 */
	async createToken(
		params: ICreateQueueTokenParams,
	): Promise<QueueTokenResponseDto> {
		const { userId, concertId } = params;
		const payload = {
			userId,
			concertId,
			status: TokenStatus.WAITING, // 대기열
			purpose: TokenPurpose.QUEUE_ENTRY,
		};

		const token = await this.jwtService.signJwtAsync(payload, QUEUE_TOKEN_TTL);
		const cacheKey = this._getCacheKey(token);
		await this.redisService.set(cacheKey, 'true', QUEUE_TOKEN_TTL);
		this.logger.log(
			`Queue token created and stored in Redis for userId: ${userId}, concertId: ${concertId}`,
		);

		return { token };
	}

	async verifyToken(userId: number, token: string): Promise<boolean> {
		// check expired
		const cacheKey = this._getCacheKey(token);
		const tokenValue = await this.redisService.get(cacheKey);
		if (!tokenValue) {
			return false;
		}

		const payload = await this.jwtService.verifyJwtAsync(tokenValue);

		if (
			payload.userId !== userId ||
			payload.purpose !== TokenPurpose.QUEUE_ENTRY ||
			payload.status !== TokenStatus.PROCESSING // 대기열 통과
		) {
			return false;
		}

		return true;
	}
}
