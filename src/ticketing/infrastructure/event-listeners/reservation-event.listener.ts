import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DataPlatformService } from 'src/data-platform/application/services/data-platform.service';
import { PaymentService } from 'src/payment/application/services/payment.service';
import {
	ReservationFailedEvent,
	ReservationSuccessEvent,
} from 'src/ticketing/application/event-publishers/reservation-event';

@Injectable()
export class ReservationEventListener {
	private readonly logger = new Logger(ReservationEventListener.name);

	constructor(
		private readonly dataPlatformService: DataPlatformService,
		private readonly paymentService: PaymentService,
	) {}

	// @@@TODO OnEventSafe 만들기.
	@OnEvent('reservation.success')
	async onReservationSuccess(event: ReservationSuccessEvent): Promise<void> {
		this.logger.log('reservation.success event received');

		await this.paymentService.use(event.data.userId, event.data.purchasePrice);
		await this.dataPlatformService.send(event);
		return;
	}

	@OnEvent('reservation.failed')
	async onReservationFailed(event: ReservationFailedEvent): Promise<void> {
		this.logger.log('reservation.failed event received');

		// @@@TODO 예약관련 보상트랜잭션
		// const payload = event.data;

		await this.dataPlatformService.send(event);
		return;
	}
}
