import { Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { Body } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthGuard } from '../../auth/application/services/auth.guard';
import { PaymentService } from '../application/services/payment.service';
import {
	ChargeRequestDto,
	PaymentProcessRequestDto,
	PointUseRequestDto,
} from './dtos/request.dto';
import {
	ChargeResponseDto,
	PaymentProcessResponseDto,
	PointUseResponseDto,
} from './dtos/response.dto';

@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('/payment')
export class PaymentController {
	constructor(private readonly paymentService: PaymentService) {}

	@Patch('/charge')
	@ApiOperation({ summary: '포인트 충전' })
	@ApiOkResponse({ type: ChargeResponseDto, description: '포인트 충전 성공' })
	async charge(
		@Req() req: Request,
		@Body() body: ChargeRequestDto,
	): Promise<ChargeResponseDto> {
		const userId = req.userId;
		return this.paymentService.charge(userId, body.amount);
	}

	// old ver.
	@Patch('/use')
	@ApiOperation({ summary: '포인트 결제' })
	@ApiOkResponse({ type: PointUseResponseDto, description: '포인트 결제 성공' })
	async use(
		@Req() req: Request,
		@Body() body: PointUseRequestDto,
	): Promise<PointUseResponseDto> {
		const userId = req.userId;
		return this.paymentService.use(userId, body.amount);
	}

	// new ver.
	@Patch('/process')
	@ApiOperation({ summary: '결제 처리 및 예약 확정' })
	async processPayment(
		@Req() req: Request,
		@Body() body: PaymentProcessRequestDto,
	): Promise<PaymentProcessResponseDto> {
		const userId = req.userId;
		return this.paymentService.processPaymentAndReservation(
			userId,
			body.reservationId,
			body.paymentToken,
		);
	}

	@Get('/balance')
	@ApiOperation({ summary: '포인트 잔액 조회' })
	@ApiOkResponse({
		type: PointUseResponseDto,
		description: '포인트 잔액 조회 성공',
	})
	async getBalance(@Req() req: Request): Promise<PointUseResponseDto> {
		const userId = req.userId;
		return this.paymentService.getBalance(userId);
	}
}
