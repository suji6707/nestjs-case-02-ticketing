import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '../../auth/application/services/auth.guard';
import { RankingService } from '../application/services/ranking.service';
import { FastSelloutRankingResponseDto } from './dtos/response.dto';

@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('/ticketing/ranking')
export class RankingController {
	constructor(private readonly rankingService: RankingService) {}

	// 빠른예약 랭킹 조회
	@Get('/ranking/fast-sellout')
	@ApiOperation({ summary: '빠른예약 랭킹 조회' })
	@ApiOkResponse({
		type: FastSelloutRankingResponseDto,
		description: '빠른예약 랭킹 조회 성공',
	})
	async fastSelloutRanking(): Promise<FastSelloutRankingResponseDto> {
		return this.rankingService.getFastSelloutRanking();
	}
}
