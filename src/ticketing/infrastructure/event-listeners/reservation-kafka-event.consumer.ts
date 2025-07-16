import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { DataPlatformService } from 'src/data-platform/application/services/data-platform.service';
import { ReservationSuccessKafkaEvent } from 'src/ticketing/application/event-publishers/reservation-event';

@Controller()
export class ReservationKafkaEventConsumer {
	private readonly logger = new Logger(ReservationKafkaEventConsumer.name);

	constructor(private readonly dataPlatformService: DataPlatformService) {}

	@EventPattern('reservation.success')
	async onReservationSuccess(
		@Payload() event: ReservationSuccessKafkaEvent,
	): Promise<void> {
		try {
			this.logger.log('[Kafka] reservation.success event received');

			await this.dataPlatformService.send(event);
			return;
		} catch (error) {
			this.logger.error(
				`[Kafka] Failed to process reservation.success event: ${error.message}`,
			);
		}
	}
}
