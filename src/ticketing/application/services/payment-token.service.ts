import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from 'src/auth/services/jwt.service';
import { RedisService } from 'src/common/services/redis/redis.service';
import { PAYMENT_TOKEN_TTL } from 'src/common/utils/constants';
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

	private _getCacheKey(token: string): string {
		return `token:payment:${token}`;
	}

	async createToken(params: CreateTokenParams): Promise<ITokenResponseDto> {
		const paymentParams = params as ICreatePaymentTokenParams;
		const { userId, seatId } = paymentParams;

		const payload = {
			userId,
			seatId,
			status: TokenStatus.WAITING, // 결제 대기
			purpose: TokenPurpose.PAYMENT,
		};

		const token = await this.jwtService.signJwtAsync(
			payload,
			PAYMENT_TOKEN_TTL,
		);
		const redisKey = this._getCacheKey(token);
		await this.redisService.set(redisKey, 'true', PAYMENT_TOKEN_TTL);
		this.logger.log(
			`Payment token created and stored in Redis for userId: ${userId}, seatId: ${seatId}`,
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
			payload.purpose !== TokenPurpose.PAYMENT ||
			payload.status !== TokenStatus.WAITING // 결제 대기
		) {
			return false;
		}

		return true;
	}
}
