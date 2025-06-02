import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthGuard } from '../../auth/services/auth.guard';
import { EventSearchService } from '../application/services/event-search.service';
import {
	ConcertScheduleRequestDto,
	ConcertSeatRequestDto,
} from './dtos/request.dto';
import {
	ConcertSchduleResponseDto,
	ConcertSeatResponseDto,
} from './dtos/response.dto';

@Controller('/ticketing/search')
export class EventSearchController {
	constructor(private readonly eventSearchService: EventSearchService) {}
	// 콘서트 검색 - 로그인 없이 조회 가능
	// GET /concert

	// 예약가능 날짜 조회 - 대기열 토큰 검증
	@ApiBearerAuth()
	@ApiOperation({ summary: '예약가능 날짜 조회' })
	@ApiOkResponse({
		type: ConcertSchduleResponseDto,
		description: '예약가능 날짜 조회 성공',
	})
	@UseGuards(AuthGuard)
	@Post('/concerts/:id/schedules')
	async getSchedules(
		@Req() req: Request,
		@Param('id') concertId: number,
		@Body() dto: ConcertScheduleRequestDto,
	): Promise<ConcertSchduleResponseDto> {
		const userId = req.userId;
		return this.eventSearchService.getSchedules(
			userId,
			concertId,
			dto.queueToken,
		);
	}

	// 예약가능 좌석 조회 - 대기열 토큰 검증
	@ApiBearerAuth()
	@ApiOperation({ summary: '예약가능 좌석 조회' })
	@ApiOkResponse({
		type: ConcertSeatResponseDto,
		description: '예약가능 좌석 조회 성공',
	})
	@UseGuards(AuthGuard)
	@Post('/schedules/:scheduleId/seats')
	async getSeats(
		@Req() req: Request,
		@Param('scheduleId') scheduleId: number,
		@Body() dto: ConcertSeatRequestDto,
	): Promise<ConcertSeatResponseDto> {
		const userId = req.userId;
		return this.eventSearchService.getSeats(userId, scheduleId, dto.queueToken);
	}
}
