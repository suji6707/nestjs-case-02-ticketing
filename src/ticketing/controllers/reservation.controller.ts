import {
	Controller,
	Get,
	Inject,
	Param,
	ParseIntPipe,
	Req,
} from '@nestjs/common';
import { Post } from '@nestjs/common';
import { Body } from '@nestjs/common';
import { UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthGuard } from '../../auth/application/services/auth.guard';
import { Reservation } from '../application/domain/models/reservation';
import { ITokenService } from '../application/services/interfaces/itoken.service';
import { QueueTokenService } from '../application/services/queue-token.service';
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
		private readonly tokenService: QueueTokenService,
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
		return this.reservationService.temporaryReserve(
			userId,
			body.seatId,
			body.queueToken,
		);
	}

	// 결제 요청 및 좌석 임시배정, 임시 결제 토큰 삭제
	// @Post('/confirm')
	// @ApiOperation({ summary: '결제 요청' })
	// @ApiOkResponse({ type: PaymentResponseDto, description: '결제 요청 성공' })
	// async payment(@Body() body: PaymentRequestDto): Promise<PaymentResponseDto> {
	// 	return this.reservationService.confirmReservation(body.reservationId);
	// }

	// 예약 현황 조회
	@Get('/:reservationId')
	@ApiOperation({ summary: '예약 현황 조회' })
	@ApiOkResponse({
		type: ReserveResponseDto,
		description: '예약 현황 조회 성공',
	})
	async history(
		@Req() req: Request,
		@Param('reservationId', ParseIntPipe) reservationId: number,
	): Promise<optional<Reservation>> {
		return this.reservationService.getInfo(reservationId);
	}
}
