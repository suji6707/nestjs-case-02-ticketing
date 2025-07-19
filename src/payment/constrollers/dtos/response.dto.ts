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
	@ApiProperty({ example: '1234567890', description: '결제 트랜잭션 ID' })
	paymentTxId: string;

	@ApiProperty({ example: 'PAYMENT_PROCESSING', description: '결제 상태' })
	status: string;

	@ApiProperty({
		example: '결제 처리 중입니다. 잠시 후 결과를 확인해주세요.',
		description: '메시지',
	})
	message: string;
}
