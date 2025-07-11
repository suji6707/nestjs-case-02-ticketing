import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { Injectable } from '@nestjs/common';
import { EventLogEntity } from '@prisma/client';

@Injectable()
export class EventLogPrismaRepository {
	constructor(
		private readonly txHost: TransactionHost<TransactionalAdapterPrisma>,
	) {}

	async create(
		eventName: string,
		timestamp: Date,
		data: any,
	): Promise<EventLogEntity> {
		return this.txHost.tx.eventLogEntity.create({
			data: {
				eventName,
				timestamp,
				data,
			},
		});
	}
}
