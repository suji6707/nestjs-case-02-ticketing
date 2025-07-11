import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { OnEventSafe } from 'src/common/decorators/on-event-safe.decorator';
import { DataPlatformService } from 'src/data-platform/application/services/data-platform.service';
import { ReservationSuccessEvent } from 'src/ticketing/application/event-publishers/reservation-event';

@Injectable()
export class ReservationEventListener {
	private readonly logger = new Logger(ReservationEventListener.name);

	constructor(private readonly dataPlatformService: DataPlatformService) {}

	@OnEventSafe('reservation.success')
	async onReservationSuccess(event: ReservationSuccessEvent): Promise<void> {
		this.logger.log('reservation.success event received');

		await this.dataPlatformService.send(event);
		return;
	}
}
