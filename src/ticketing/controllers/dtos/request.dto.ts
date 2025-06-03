import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsString } from 'class-validator';

export class QueueTokenRequestDto {
	@ApiProperty({ example: 3, description: '콘서트 ID' })
	@Type(() => Number)
	@IsNumber()
	concertId: number;
}

export class ReserveSeatRequestDto {
	@ApiProperty({ example: 1, description: '좌석 ID' })
	@Type(() => Number)
	@IsNumber()
	seatId: number;

	@ApiProperty({
		example: 'eyJhbGciOiJIUI6I...HDk',
		description: '대기열 토큰',
	})
	@IsString()
	queueToken: string;
}

export class PaymentRequestDto {
	@ApiProperty({ example: [1], description: '예약 ID 리스트' })
	@IsArray()
	@IsNumber({}, { each: true })
	@Type(() => Number)
	reservationIds: number[];

	@ApiProperty({
		example: 'eyJhbGciOiJIUI6I...HDk',
		description: '결제 대기 토큰',
	})
	@IsString()
	paymentToken: string;
}

export class ConcertScheduleRequestDto {
	@ApiProperty({
		example: 'eyJhbGciOiJIUI6I...HDk',
		description: '대기열 토큰',
	})
	@IsString()
	queueToken: string;
}

export class ConcertSeatRequestDto {
	@ApiProperty({
		example: 'eyJhbGciOiJIUI6I...HDk',
		description: '대기열 토큰',
	})
	@IsString()
	queueToken: string;
}
