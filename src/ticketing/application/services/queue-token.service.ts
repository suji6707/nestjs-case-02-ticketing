import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from 'src/auth/application/services/jwt.service';
import { RedisService } from 'src/common/services/redis/redis.service';
import { QUEUE_TOKEN_TTL } from 'src/common/utils/constants';
import { getQueueTokenKey } from 'src/common/utils/redis-keys';
import { QueueProducer } from 'src/ticketing/infrastructure/external/queue-producer.service';
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
		private readonly QueueProducer: QueueProducer,
	) {}

	/**
	 * 순번 진입시 해당 토큰 status = PROCESSING 으로 변경
	 * seat lock에서 해당 토큰을 value로 set
	 */
	async createToken(
		params: ICreateQueueTokenParams,
	): Promise<QueueTokenResponseDto> {
		const { userId, concertId } = params;
		const payload = {
			userId,
			concertId,
			purpose: TokenPurpose.QUEUE_ENTRY,
		};

		const token = await this.jwtService.signJwtAsync(payload, QUEUE_TOKEN_TTL);
		const cacheKey = getQueueTokenKey(token);
		await this.redisService.set(
			cacheKey,
			TokenStatus.WAITING, // 대기열 대기
			QUEUE_TOKEN_TTL,
		);
		this.logger.log(
			`Queue token created and stored in Redis for userId: ${userId}, concertId: ${concertId}`,
		);

		await this.QueueProducer.addJob(`concert:${concertId}:queue`, { token });

		return { token };
	}

	async verifyToken(userId: number, token: string): Promise<boolean> {
		// check expired
		const cacheKey = getQueueTokenKey(token);
		const tokenStatus = await this.redisService.get(cacheKey);
		if (!tokenStatus) {
			return false;
		}

		const payload = await this.jwtService.verifyJwtAsync(token);

		if (
			payload.userId !== userId ||
			payload.purpose !== TokenPurpose.QUEUE_ENTRY ||
			tokenStatus !== TokenStatus.PROCESSING // 대기열 통과(예약페이지 진입) 여부
		) {
			return false;
		}

		return true;
	}

	async deleteToken(token: string): Promise<boolean> {
		const cacheKey = getQueueTokenKey(token);
		const success = await this.redisService.delete(cacheKey);
		if (!success) {
			this.logger.error(`Failed to delete token: ${token}`);
			return false;
		}
		return true;
	}
}
