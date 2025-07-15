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

export class PaymentProcessResponseDto {
	@ApiProperty({ example: 50000, description: '잔액' })
	balance: number;

	@ApiProperty({ example: 1, description: '예약 ID' })
	reservationId: number;

	@ApiProperty({ example: 'PAYMENT_COMPLETED', description: '결제 상태' })
	status: string;

	@ApiProperty({
		example: '결제가 완료되었습니다. 예약 확정은 잠시 후 완료됩니다.',
		description: '메시지',
	})
	message: string;
}
