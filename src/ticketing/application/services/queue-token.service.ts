import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from 'src/auth/application/services/jwt.service';
import { RedisService } from 'src/common/services/redis/redis.service';
import { QUEUE_TOKEN_TTL } from 'src/common/utils/constants';
import {
	getQueueName,
	getQueueTokenJobIdKey,
	getQueueTokenKey,
} from 'src/common/utils/redis-keys';
import { QueueProducer } from 'src/ticketing/infrastructure/external/queue-producer.service';
import { QueueTokenResponseDto } from '../../controllers/dtos/response.dto';
import { TokenStatus } from '../domain/models/token';
import {
	ICreateQueueTokenParams,
	ITokenService,
} from './interfaces/itoken.service';
import { QueueRankingService } from './queue-ranking.service';

@Injectable()
export class QueueTokenService implements ITokenService {
	private readonly logger = new Logger(QueueTokenService.name);

	constructor(
		private readonly redisService: RedisService,
		private readonly jwtService: JwtService,
		private readonly queueRankingService: QueueRankingService,
	) {}

	/**
	 * 토큰 생성과 동시에 waiting queue(sorted set)에 추가
	 */
	async createToken(
		params: ICreateQueueTokenParams,
	): Promise<QueueTokenResponseDto> {
		const { userId, concertId } = params;
		const payload = {
			userId,
			concertId,
		};
		const token = await this.jwtService.signJwtAsync(payload, QUEUE_TOKEN_TTL);

		// sorted set
		await this.queueRankingService.addToWaitingQueue(token);
		this.logger.log(
			`Queue token created and stored in Redis for userId: ${userId}, concertId: ${concertId}`,
		);
		return { token };
	}

	async verifyToken(
		userId: number,
		token: string,
		neededStatus: TokenStatus,
	): Promise<boolean> {
		// check sorted set: activeQueue에 있으면 true
		const queueStatus = await this.queueRankingService.checkQueueStatus(token);
		console.log('queueStatus', queueStatus);
		if (
			neededStatus === TokenStatus.WAITING &&
			queueStatus.waitingRank === -1
		) {
			return false;
		}
		if (
			neededStatus === TokenStatus.PROCESSING &&
			queueStatus.activeRemainTime === -1
		) {
			return false;
		}

		const payload = await this.jwtService.verifyJwtAsync(token);

		if (payload.userId !== userId) {
			return false;
		}

		return true;
	}

	async verifyTokenWithRetry(
		userId: number,
		token: string,
		neededStatus: TokenStatus,
		maxRetries = 3,
		retryInterval = 200
	) {
		for (let i = 0; i < maxRetries; i++) {
			const isValid = await this.verifyToken(userId, token, neededStatus);
			if (isValid) {
				return true;
			}
			await new Promise((resolve) => setTimeout(resolve, retryInterval));
		}
		return false;
	}

	async deleteToken(token: string): Promise<boolean> {
		// sorted set에서 삭제
		await this.queueRankingService.deleteFromWaitingQueue(token);
		await this.queueRankingService.deleteFromActiveQueue(token);
		return true;
	}
}
