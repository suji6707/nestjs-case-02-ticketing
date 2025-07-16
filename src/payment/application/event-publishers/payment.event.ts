import {
	IEvent,
	IKafkaEvent,
} from 'src/common/interfaces/ievent-bus.interface';

export interface PaymentSuccessData {
	reservationId: number;
}

export interface PaymentCancelData {
	userId: number;
	amount: number;
}

export class PaymentSuccessEvent implements IEvent {
	eventName = 'payment.success';
	timestamp: Date;
	data: PaymentSuccessData;

	constructor(data: PaymentSuccessData) {
		this.timestamp = new Date();
		this.data = data;
	}
}

export class PaymentCancelEvent implements IEvent {
	eventName = 'payment.cancel';
	timestamp: Date;
	data: PaymentCancelData;

	constructor(data: PaymentCancelData) {
		this.timestamp = new Date();
		this.data = data;
	}
}

export class PaymentSuccessKafkaEvent
	extends PaymentSuccessEvent
	implements IKafkaEvent
{
	eventId: string;
}

export class PaymentCancelKafkaEvent
	extends PaymentCancelEvent
	implements IKafkaEvent
{
	eventId: string;
}
