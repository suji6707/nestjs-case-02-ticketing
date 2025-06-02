import { Injectable } from '@nestjs/common';
import { JwtService } from 'src/auth/services/jwt.service';
import { RedisService } from 'src/common/services/redis/redis.service';
import { QueueTokenResponseDto } from '../../controllers/dtos/response.dto';
import { TokenPurpose, TokenStatus } from '../domain/models/token';

@Injectable()
export class TokenService {
	constructor(
		private readonly redisService: RedisService,
		private readonly jwtService: JwtService,
	) {}

	async createToken(
		userId: number,
		concertId: number,
	): Promise<QueueTokenResponseDto> {
		const payload = {
			userId,
			concertId,
			status: TokenStatus.WAITING,
			purpose: TokenPurpose.QUEUE_ENTRY,
		};

		const token = await this.jwtService.signJwtAsync(payload, '1h');
		await this.redisService.set(token, '1h');

		return {
			queueToken: token,
		};
	}

	async verifyToken(
		userId: number,
		token: string,
		purpose: TokenPurpose,
	): Promise<boolean> {
		// check expired
		const tokenValue = await this.redisService.get(token);
		if (!tokenValue) {
			return false;
		}

		const payload = await this.jwtService.verifyJwtAsync(tokenValue);

		if (payload.userId !== userId || payload.purpose !== purpose) {
			return false;
		}

		let isValidToken = false;
		if (
			payload.purpose === TokenPurpose.QUEUE_ENTRY &&
			payload.status === TokenStatus.PROCESSING // 대기열을 통과
		) {
			isValidToken = true;
		} else if (
			payload.purpose === TokenPurpose.PAYMENT &&
			payload.status === TokenStatus.WAITING // 결제 대기 상태
		) {
			isValidToken = true;
		}

		return isValidToken;
	}
}
