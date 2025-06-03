import { Controller, Inject, Req } from '@nestjs/common';
import { Post } from '@nestjs/common';
import { Body } from '@nestjs/common';
import { UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthGuard } from '../../auth/services/auth.guard';
import { ITokenService } from '../application/services/interfaces/itoken.service';
import { ReservationService } from '../application/services/reservation.service';
import {
	PaymentRequestDto,
	QueueTokenRequestDto,
	ReserveSeatRequestDto,
} from './dtos/request.dto';
import {
	PaymentResponseDto,
	QueueTokenResponseDto,
	ReserveResponseDto,
} from './dtos/response.dto';

@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('/ticketing/reservation')
export class ReservationController {
	constructor(
		private readonly reservationService: ReservationService,
		@Inject('QueueTokenService')
		private readonly tokenService: ITokenService,
	) {}

	// 대기열 토큰발급 (TTL 1시간)
	@Post('/token')
	@ApiOperation({ summary: '대기열 토큰발급' })
	@ApiOkResponse({
		type: QueueTokenResponseDto,
		description: '대기열 토큰발급 성공',
	})
	async createToken(
		@Req() req: Request,
		@Body() body: QueueTokenRequestDto,
	): Promise<QueueTokenResponseDto> {
		const userId = req.userId;
		return this.tokenService.createToken({
			userId,
			concertId: body.concertId,
		});
	}

	// 예약 요청 -> 대기열 토큰 삭제, 임시 결제 토큰 발급 (TTL 5분)
	@Post('/new')
	@ApiOperation({ summary: '예약 요청' })
	@ApiOkResponse({ type: ReserveResponseDto, description: '예약 요청 성공' })
	async reserve(
		@Req() req: Request,
		@Body() body: ReserveSeatRequestDto,
	): Promise<ReserveResponseDto> {
		const userId = req.userId;
		return this.reservationService.reserve(
			userId,
			body.seatId,
			body.queueToken,
		);
	}

	// 결제 요청 및 좌석 임시배정, 임시 결제 토큰 삭제
	@Post('/payment')
	@ApiOperation({ summary: '결제 요청' })
	@ApiOkResponse({ type: PaymentResponseDto, description: '결제 요청 성공' })
	async payment(
		@Req() req: Request,
		@Body() body: PaymentRequestDto,
	): Promise<PaymentResponseDto> {
		const userId = req.userId;
		return this.reservationService.payment(userId, body.reservationIds);
	}

	// 예약 현황 조회
	// GET /history
}
