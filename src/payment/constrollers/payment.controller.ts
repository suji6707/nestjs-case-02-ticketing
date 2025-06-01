import { Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { PaymentService } from '../services/payment.service';
import { AuthGuard } from '../../auth/services/auth.guard';
import { Request } from 'express';
import { Body } from '@nestjs/common';
import { ChargeRequestDto, PointUseRequestDto } from './dtos/request.dto';
import {
	ChargeResponseDto,
	BalanceResponseDto,
	PointUseResponseDto,
} from './dtos/response.dto';
import { ApiBearerAuth, ApiOkResponse, ApiOperation } from '@nestjs/swagger';

@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('/payment')
export class PaymentController {
	constructor(private readonly paymentService: PaymentService) {}

	@Get('/balance')
	@ApiOperation({ summary: '포인트 잔액 조회' })
	@ApiOkResponse({
		type: BalanceResponseDto,
		description: '포인트 잔액 조회 성공',
	})
	async getBalance(@Req() req: Request): Promise<BalanceResponseDto> {
		const userId = req.userId;
		return this.paymentService.getBalance(userId);
	}

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
}
