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
		private readonly queueProducer: QueueProducer,
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

		const job = await this.queueProducer.addJob(getQueueName(concertId), {
			token,
		});
		const jobCacheKey = getQueueTokenJobIdKey(token);
		await this.redisService.set(jobCacheKey, job.id, QUEUE_TOKEN_TTL);

		return { token };
	}

	// TODO: 대기 순번 확인

	async verifyToken(userId: number, token: string): Promise<boolean> {
		// check expired
		const cacheKey = getQueueTokenKey(token);
		const tokenStatus = await this.redisService.get(cacheKey);
		console.log('queueTokenStatus', tokenStatus);
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
		const jobCacheKey = getQueueTokenJobIdKey(token);
		const success = await this.redisService.delete(cacheKey, jobCacheKey);
		if (!success) {
			this.logger.error(`Failed to delete token: ${token}`);
			return false;
		}
		return true;
	}

	async checkAndUpdateTokenStatus(token: string): Promise<boolean> {
		const isProcessing = await this._checkIsProcessing(token);
		if (!isProcessing) {
			return false;
		}
		// update token status WAITING -> PROCESSING
		await this.redisService.set(
			getQueueTokenKey(token),
			TokenStatus.PROCESSING,
			QUEUE_TOKEN_TTL,
		);
		return true;
	}

	// 대기열 진입 순서인지 job status 체크
	private async _checkIsProcessing(token: string): Promise<boolean> {
		const payload = await this.jwtService.verifyJwtAsync(token);
		const concertId = payload.concertId;

		const jobCacheKey = getQueueTokenJobIdKey(token);
		const jobId = await this.redisService.get(jobCacheKey);
		if (!jobId) {
			return false;
		}
		const job = await this.queueProducer.getJob(getQueueName(concertId), jobId);

		const jobState = await job.getState();
		console.log('jobState', jobState);

		return jobState === 'active';
	}
}
