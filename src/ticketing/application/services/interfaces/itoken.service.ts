import { ITokenResponseDto } from 'src/ticketing/controllers/dtos/response.dto';
import { TokenStatus } from '../../domain/models/token';

export interface ICreateQueueTokenParams {
	userId: number;
	concertId: number;
}

export interface ICreatePaymentTokenParams {
	userId: number;
	seatId: number;
}

export type CreateTokenParams =
	| ICreateQueueTokenParams
	| ICreatePaymentTokenParams;

export interface ITokenService {
	createToken(params: CreateTokenParams): Promise<ITokenResponseDto>;
	verifyToken(
		userId: number,
		token: string,
		neededStatus: TokenStatus,
	): Promise<boolean>;
	deleteToken(key: string): Promise<boolean>;
}
