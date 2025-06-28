import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsNumber, IsString } from 'class-validator';
import { ReservationStatus } from 'src/ticketing/application/domain/models/reservation';

export interface ITokenResponseDto {
	token: string;
}

export class QueueTokenResponseDto implements ITokenResponseDto {
	@ApiProperty({
		example: 'eyJhbGciOiJIUI6I...HDk',
		description: '대기열 토큰',
	})
	@IsString()
	token: string;
}

export class PaymentTokenResponseDto implements ITokenResponseDto {
	@ApiProperty({
		example: 'eyJhbGciOiJIUI6I...HDk',
		description: '결제 대기 토큰',
	})
	@IsString()
	token: string;
}

export class ReserveResponseDto {
	@ApiProperty({ example: 1, description: '예약 ID' })
	@IsNumber()
	reservationId: number;

	@ApiProperty({
		example: 'eyJhbGciOiJIUI6I...HDk',
		description: '결제 대기 토큰',
	})
	@IsString()
	paymentToken: string;
}

export class ReservationItem {
	@ApiProperty({ example: 1, description: '예약 ID' })
	@IsNumber()
	id: number;

	@ApiProperty({ example: 1, description: '좌석 ID' })
	@IsNumber()
	seatId: number;

	@ApiProperty({ example: 10000, description: '결제 금액' })
	@IsNumber()
	purchasePrice: number;

	@ApiProperty({
		example: ReservationStatus.CONFIRMED,
		description: '예약 상태',
	})
	@IsEnum(ReservationStatus)
	status: ReservationStatus;

	@ApiProperty({
		example: '2025-06-01T19:00:00.000Z',
		description: '결제 시간',
	})
	@IsDate()
	paidAt: Date;
}

export class PaymentResponseDto {
	@ApiProperty({
		type: ReservationItem,
		example: {
			id: 10,
			seatId: 55,
			purchasePrice: 10000,
			status: ReservationStatus.CONFIRMED,
			paidAt: new Date(),
		},
		description: '결제 완료된 예약 정보',
	})
	reservation: ReservationItem;
}

export class ConcertScheduleItem {
	@ApiProperty({ example: 1, description: '스케줄 ID' })
	id: number;

	@ApiProperty({ example: 10000, description: '기본가격' })
	basePrice: number;

	@ApiProperty({
		example: '2025-06-01T19:00:00.000Z',
		description: '공연 시작 시간',
		type: String,
	})
	startTime: Date;

	@ApiProperty({
		example: '2025-06-01T21:00:00.000Z',
		description: '공연 종료 시간',
		type: String,
	})
	endTime: Date;

	@ApiProperty({ example: false, description: '예약 가능 여부' })
	isSoldOut: boolean;
}

export class ConcertSchduleResponseDto {
	@ApiProperty({
		type: [ConcertScheduleItem],
		description: '예약 가능한 콘서트 스케줄 리스트',
		example: [
			{
				id: 1,
				basePrice: 10000,
				startTime: new Date('2025-06-01T19:00:00.000Z'),
				endTime: new Date('2025-06-01T21:00:00.000Z'),
				isSoldOut: false,
			},
			{
				id: 2,
				basePrice: 10000,
				startTime: new Date('2025-06-02T19:00:00.000Z'),
				endTime: new Date('2025-06-02T21:00:00.000Z'),
				isSoldOut: false,
			},
		],
	})
	schedules: ConcertScheduleItem[];
}

export class ConcertSeatItem {
	@ApiProperty({ example: 1, description: '좌석 번호' })
	number: number;

	@ApiProperty({ example: 'A', description: '좌석 등급' })
	className: string;

	@ApiProperty({ example: 10000, description: '좌석 가격' })
	price: number;

	@ApiProperty({ example: 0, description: '좌석 상태' })
	status: number;
}

export class ConcertSeatResponseDto {
	@ApiProperty({
		type: [ConcertSeatItem],
		description: '예약 가능한 콘서트 좌석 리스트',
		example: {
			1: {
				id: 1,
				number: 1,
				className: 'A',
				price: 10000,
				status: 0,
			},
			2: {
				number: 2,
				className: 'B',
				price: 20000,
				status: 0,
			},
		},
	})
	seats: Record<number, ConcertSeatItem>;
}
