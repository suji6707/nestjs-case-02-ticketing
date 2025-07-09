import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DataPlatformService } from 'src/data-platform/application/services/data-platform.service';
import {
	PaymentFailedEvent,
	PaymentSuccessEvent,
} from 'src/payment/application/event-publishers/payment.event';

@Injectable()
export class PaymentEventListener {
	private readonly logger = new Logger(PaymentEventListener.name);

	constructor(private readonly dataPlatformService: DataPlatformService) {}

	// @@@TODO OnEventSafe 만들기.
	@OnEvent('payment.success')
	async onPaymentSuccess(event: PaymentSuccessEvent): Promise<void> {
		this.logger.log('payment.success event received');

		await this.dataPlatformService.send(event);
		return;
	}

	@OnEvent('payment.failed')
	async onPaymentFailed(event: PaymentFailedEvent): Promise<void> {
		this.logger.log('payment.failed event received');

		// @@@TODO 결제관련 보상트랜잭션
		// const payload = event.data;

		await this.dataPlatformService.send(event);
		return;
	}
}
