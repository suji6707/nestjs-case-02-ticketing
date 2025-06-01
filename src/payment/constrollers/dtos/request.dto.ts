import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber } from 'class-validator';

export class ChargeRequestDto {
	@ApiProperty({ example: 10000, description: '충전 금액' })
	@Type(() => Number)
	@IsNumber()
	amount: number;
}

export class PointUseRequestDto {
	@ApiProperty({ example: 500, description: '사용 포인트' })
	@Type(() => Number)
	@IsNumber()
	amount: number;
}
