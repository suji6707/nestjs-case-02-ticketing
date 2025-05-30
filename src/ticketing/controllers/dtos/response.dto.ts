import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsNumber, IsString } from "class-validator";

export class QueueTokenResponseDto {
	@ApiProperty({ example: 'eyJhbGciOiJIUI6I...HDk', description: '대기열 토큰' })
	@IsString()
	queueToken: string;
}

export class ReserveResponseDto {
	@ApiProperty({ example: [1], description: '예약 ID 리스트' })
	@IsArray()
	@IsNumber({}, { each: true })
	@Type(() => Number)
	reservationIds: number[];

	@ApiProperty({ example: 'eyJhbGciOiJIUI6I...HDk', description: '결제 대기 토큰' })
	@IsString()
	paymentToken: string;
}

export class PaymentResponseDto {
	@ApiProperty({ example: [1], description: '결제 완료된 예약 ID 리스트' })
	@IsArray()
	@IsNumber({}, { each: true })
	@Type(() => Number)
	reservationIds: number[];
}


export class ConcertScheduleItem {
	@ApiProperty({ example: 1, description: '스케줄 ID' })
	id: number;
  
	@ApiProperty({ example: 3, description: '콘서트 ID' })
	concertId: number;

	@ApiProperty({ example: 10000, description: '기본가격' })
	basePrice: number;
  
	@ApiProperty({ example: '2025-06-01T19:00:00.000Z', description: '공연 시작 시간', type: String })
	startTime: Date;
  
	@ApiProperty({ example: '2025-06-01T21:00:00.000Z', description: '공연 종료 시간', type: String })
	endTime: Date;
}
export class ConcertSchduleResponseDto {
	@ApiProperty({
	  type: [ConcertScheduleItem],
	  description: '예약 가능한 콘서트 스케줄 리스트',
	  example: [
		{
		  id: 1,
		  concertId: 3,
		  basePrice: 10000,
		  startTime: new Date('2025-06-01T19:00:00.000Z'),
		  endTime: new Date('2025-06-01T21:00:00.000Z'),
		},
		{
		  id: 2,
		  concertId: 3,
		  basePrice: 10000,
		  startTime: new Date('2025-06-02T19:00:00.000Z'),
		  endTime: new Date('2025-06-02T21:00:00.000Z'),
		},
	  ],
	})
	schedules: ConcertScheduleItem[];
}