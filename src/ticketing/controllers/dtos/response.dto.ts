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