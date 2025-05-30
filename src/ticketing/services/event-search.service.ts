import { Injectable } from '@nestjs/common';
import { Concert } from '@prisma/client';
import { ConcertRepository } from '../repositories/concert.repository';
import { ConcertScheduleRequestDto } from '../controllers/dtos/request.dto';
import { ConcertSchduleResponseDto } from '../controllers/dtos/response.dto';

@Injectable()
export class EventSearchService {
	constructor(private readonly concertRepository: ConcertRepository) {}

	async getConcerts(): Promise<Concert[]> {
		return this.concertRepository.findAll();
	}

	async getSchedules(userId: number, dto: ConcertScheduleRequestDto): Promise<ConcertSchduleResponseDto> {
		return this.concertRepository.findSchedules(userId, dto.concertId);
	}
}
