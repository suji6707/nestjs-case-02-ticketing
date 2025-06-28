import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import {
	ConcertSchduleResponseDto,
	ConcertSeatResponseDto,
} from '../../controllers/dtos/response.dto';
import { Concert } from '../domain/models/concert';
import { IConcertRepository } from '../domain/repositories/iconcert.repository';
import { ITokenService } from './interfaces/itoken.service';

@Injectable()
export class EventSearchService {
	constructor(
		@Inject('IConcertRepository')
		private readonly concertRepository: IConcertRepository,
		@Inject('QueueTokenService')
		private readonly tokenService: ITokenService,
	) {}

	async getConcerts(): Promise<Concert[]> {
		return this.concertRepository.findConcerts();
	}

	// @@@TODO: 잘 변하지 않고 자주 읽어야하는 데이터: 애플리케이션 캐시
	// @@@TODO: 좌석 hset 할 때 데이터 분리? seatId에 대한 status는 external cache, 클래스/넘버/price는 내부 캐시로.
	/**
    // 2. Redis와 DB 동시 업데이트 (Write-Through)
    await Promise.all([
      // Redis에 대기열 추가
      redis.zadd(queueKey, score, userId),
      redis.hset(userQueueKey, {
        concertId,
        joinedAt: timestamp,
        status: 'waiting'
      }),
    ]);
	 */
	async getSchedules(
		userId: number,
		concertId: number,
		queueToken: string,
	): Promise<ConcertSchduleResponseDto> {
		const isValidToken = await this.tokenService.verifyToken(
			userId,
			queueToken,
		);
		if (!isValidToken) {
			throw new BadRequestException('Invalid token');
		}

		const schedules = await this.concertRepository.findSchedules(concertId);
		return {
			schedules: schedules.map((schedule) => ({
				id: schedule.id,
				basePrice: schedule.basePrice,
				startTime: schedule.startAt,
				endTime: schedule.endAt,
				isSoldOut: schedule.isSoldOut,
			})),
		};
	}

	async getSeats(
		userId: number,
		scheduleId: number,
		queueToken: string,
	): Promise<ConcertSeatResponseDto> {
		const isValidToken = await this.tokenService.verifyToken(
			userId,
			queueToken,
		);
		if (!isValidToken) {
			throw new BadRequestException('Invalid token');
		}

		const seats = await this.concertRepository.findSeats(scheduleId);
		return {
			seats: seats.map((seat) => ({
				id: seat.id,
				number: seat.number,
				className: seat.className,
				price: seat.price,
				status: seat.status,
			})),
		};
	}
}
