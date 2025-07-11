import { Injectable } from '@nestjs/common';
import { IEvent } from 'src/common/interfaces/ievent-bus.interface';
import { EventLogPrismaRepository } from 'src/data-platform/infrastructure/persistence/event-log.repository';

@Injectable()
export class DataPlatformService {
	constructor(
		private readonly eventLogPrismaRepository: EventLogPrismaRepository,
	) {}
	async send(event: IEvent): Promise<void> {
		// 데이터분석 플랫폼에 전송
		await this.eventLogPrismaRepository.create(
			event.eventName,
			event.timestamp,
			event.data,
		);
		return;
	}
}
