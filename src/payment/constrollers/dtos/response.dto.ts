import { ApiProperty } from '@nestjs/swagger';

export class ChargeResponseDto {
	@ApiProperty({ example: 10000, description: '포인트 잔액' })
	balance: number;
}

export class BalanceResponseDto {
	@ApiProperty({ example: 10000, description: '포인트 잔액' })
	balance: number;
}

export class PointUseResponseDto {
	@ApiProperty({ example: 500, description: '포인트 잔액' })
	balance: number;
}
