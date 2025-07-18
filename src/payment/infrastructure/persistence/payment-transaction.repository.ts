import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { Injectable } from '@nestjs/common';
import { PaymentTransactionEntity } from '@prisma/client';
import {
	IPaymentTransactionRepository,
	PaymentTransactionStatus,
} from 'src/payment/application/domain/repositories/ipayment-transaction.repository';

@Injectable()
export class PaymentTransactionPrismaRepository
	implements IPaymentTransactionRepository
{
	constructor(
		private readonly txHost: TransactionHost<TransactionalAdapterPrisma>,
	) {}

	async create(
		paymentTxId: string,
		userId: number,
		seatId: number,
		status: PaymentTransactionStatus,
		retryCount = 0,
		lastFailureReason?: string,
	): Promise<PaymentTransactionEntity> {
		return this.txHost.tx.paymentTransactionEntity.create({
			data: {
				paymentTxId,
				userId,
				seatId,
				status,
				retryCount,
				lastFailureReason,
			},
		});
	}

	async findByPaymentTxId(
		paymentTxId: string,
	): Promise<PaymentTransactionEntity | null> {
		return this.txHost.tx.paymentTransactionEntity.findUnique({
			where: {
				paymentTxId,
			},
		});
	}

	async findPendingByUserAndSeat(
		userId: number,
		seatId: number,
	): Promise<PaymentTransactionEntity | null> {
		return this.txHost.tx.paymentTransactionEntity.findFirst({
			where: {
				userId,
				seatId,
				status: {
					in: [
						PaymentTransactionStatus.PENDING,
						PaymentTransactionStatus.RETRYING,
					],
				},
			},
		});
	}

	async updateStatus(
		paymentTxId: string,
		status: PaymentTransactionStatus,
		retryCount?: number,
		lastFailureReason?: string,
	): Promise<PaymentTransactionEntity> {
		const updateData: any = {
			status,
			updatedAt: new Date(),
		};

		if (retryCount !== undefined) {
			updateData.retryCount = retryCount;
		}

		if (lastFailureReason !== undefined) {
			updateData.lastFailureReason = lastFailureReason;
		}

		return this.txHost.tx.paymentTransactionEntity.update({
			where: {
				paymentTxId,
			},
			data: updateData,
		});
	}
}
