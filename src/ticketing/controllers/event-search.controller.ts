import { Controller, Get, Req, Body } from '@nestjs/common';
import { Request } from 'express';
import { EventSearchService } from '../services/event-search.service';
import { ConcertScheduleRequestDto } from './dtos/request.dto';
import { ConcertSchduleResponseDto } from './dtos/response.dto';

@Controller('/ticketing/search')
export class EventSearchController {
	constructor(private readonly eventSearchService: EventSearchService) {}
	// 콘서트 검색
	// GET /concert


	// 예약가능 날짜 조회 - 대기열 토큰 검증
	// GET /concert/:id/schedules
	@Get('/concert/:id/schedules')
	async getSchedules(@Req() req: Request, @Body() dto: ConcertScheduleRequestDto): Promise<ConcertSchduleResponseDto> {
		const userId = req.userId;
		return this.eventSearchService.getSchedules(userId, dto);
	}

	// 예약가능 좌석 조회 - 대기열 토큰 검증
	// GET /concert/:id/schedules/:scheduleId/seats
}
