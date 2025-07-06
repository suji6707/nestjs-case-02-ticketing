import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
	PaymentFailedEvent,
	PaymentSuccessEvent,
} from 'src/payment/application/event-publishers/payment.event';

interface DataPlatformSendService {
	send(payload: any): Promise<void>;
}

@Injectable()
export class PaymentEventListener {
	private readonly logger = new Logger(PaymentEventListener.name);

	constructor(
		private readonly dataPlatformSendService: DataPlatformSendService,
	) {}

	// @@@TODO OnEventSafe 만들기.
	@OnEvent('payment.success')
	async onPaymentSuccess(event: PaymentSuccessEvent): Promise<void> {
		this.logger.log('payment.success event received');

		const payload = event.data;
		await this.dataPlatformSendService.send(payload);
		return;
	}

	@OnEvent('payment.failed')
	async onPaymentFailed(event: PaymentFailedEvent): Promise<void> {
		this.logger.log('payment.failed event received');

		const payload = event.data;
		// @@@TODO 보상트랜잭션

		await this.dataPlatformSendService.send(payload);
		return;
	}
}
