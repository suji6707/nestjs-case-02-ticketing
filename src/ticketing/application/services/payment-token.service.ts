import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from 'src/auth/application/services/jwt.service';
import { RedisService } from 'src/common/services/redis/redis.service';
import { PAYMENT_EXPIRE_TTL } from 'src/common/utils/constants';
import { getPaymentTokenKey } from 'src/common/utils/redis-keys';
import { ITokenResponseDto } from 'src/ticketing/controllers/dtos/response.dto';
import { TokenPurpose, TokenStatus } from '../domain/models/token';
import {
	CreateTokenParams,
	ICreatePaymentTokenParams,
	ITokenService,
} from './interfaces/itoken.service';

@Injectable()
export class PaymentTokenService implements ITokenService {
	private readonly logger = new Logger(PaymentTokenService.name);

	constructor(
		private readonly jwtService: JwtService,
		private readonly redisService: RedisService,
	) {}

	async createToken(params: CreateTokenParams): Promise<ITokenResponseDto> {
		const paymentParams = params as ICreatePaymentTokenParams;
		const { userId, seatId } = paymentParams;

		const payload = {
			userId,
			seatId,
			purpose: TokenPurpose.PAYMENT,
		};

		const token = await this.jwtService.signJwtAsync(
			payload,
			PAYMENT_EXPIRE_TTL,
		);
		const redisKey = getPaymentTokenKey(token);
		await this.redisService.set(
			redisKey,
			TokenStatus.WAITING, // 결제 대기
			PAYMENT_EXPIRE_TTL,
		);
		this.logger.log(
			`Payment token created and stored in Redis for userId: ${userId}, seatId: ${seatId}`,
		);

		return { token };
	}

	async verifyToken(userId: number, token: string): Promise<boolean> {
		// check expired
		const cacheKey = getPaymentTokenKey(token);
		const tokenStatus = await this.redisService.get(cacheKey);
		if (!tokenStatus) {
			return false;
		}

		const payload = await this.jwtService.verifyJwtAsync(token);

		if (
			payload.userId !== userId ||
			payload.purpose !== TokenPurpose.PAYMENT ||
			tokenStatus !== TokenStatus.WAITING // 결제 대기
		) {
			return false;
		}

		return true;
	}

	async deleteToken(token: string): Promise<boolean> {
		const cacheKey = getPaymentTokenKey(token);
		const success = await this.redisService.delete(cacheKey);
		if (!success) {
			this.logger.error(`Failed to delete token: ${token}`);
			return false;
		}
		return true;
	}
}
