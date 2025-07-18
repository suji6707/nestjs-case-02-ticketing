import { PaymentTransactionEntity } from '@prisma/client';

export enum PaymentTransactionStatus {
	PENDING = 1,
	SUCCESS = 2,
	FAILURE = 3,
	RETRYING = 4,
	CANCEL = 5,
}

export interface IPaymentTransactionRepository {
	create(
		paymentTxId: string,
		userId: number,
		seatId: number,
		status: PaymentTransactionStatus,
		retryCount?: number,
		lastFailureReason?: string,
	): Promise<PaymentTransactionEntity>;
	findByPaymentTxId(
		paymentTxId: string,
	): Promise<PaymentTransactionEntity | null>;
	findPendingByUserAndSeat(
		userId: number,
		seatId: number,
	): Promise<PaymentTransactionEntity | null>;
	updateStatus(
		paymentTxId: string,
		status: PaymentTransactionStatus,
		retryCount?: number,
		lastFailureReason?: string,
	): Promise<PaymentTransactionEntity>;
}
