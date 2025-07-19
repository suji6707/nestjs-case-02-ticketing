import {
	IEvent,
	IKafkaEvent,
} from 'src/common/interfaces/ievent-bus.interface';

export interface PaymentTryData {
	reservationId: number;
	userId: number;
	seatId: number;
	amount: number;
	paymentTxId: string;
	paymentToken: string;
}
export interface PaymentSuccessData {
	reservationId: number;
	userId: number;
	seatId: number;
	amount: number;
	paymentTxId: string;
}
export interface PaymentRetryData {
	reservationId: number;
	userId: number;
	seatId: number;
	amount: number;
	paymentTxId: string;
	paymentToken: string;
	retryCount: number;
	lastFailureReason: string;
}
export interface PaymentFailureData {
	reservationId: number;
	userId: number;
	paymentTxId: string;
	reason: string;
}
export interface PaymentCancelData {
	reservationId: number;
	userId: number;
	seatId: number;
	amount: number;
	paymentTxId: string;
	reason: string;
}

export class PaymentTryKafkaEvent implements IKafkaEvent {
	eventName = 'payment.try';
	timestamp: Date;
	data: PaymentTryData;
	eventId: string;

	constructor(data: PaymentTryData) {
		this.timestamp = new Date();
		this.data = data;
	}
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
export class PaymentSuccessKafkaEvent
	extends PaymentSuccessEvent
	implements IKafkaEvent
{
	eventId: string;
}
export class PaymentRetryKafkaEvent implements IKafkaEvent {
	eventName = 'payment.retry';
	timestamp: Date;
	data: PaymentRetryData;
	eventId: string;

	constructor(data: PaymentRetryData) {
		this.timestamp = new Date();
		this.data = data;
	}
}
export class PaymentFailureKafkaEvent implements IKafkaEvent {
	eventName = 'payment.failure';
	timestamp: Date;
	data: PaymentFailureData;
	eventId: string;

	constructor(data: PaymentFailureData) {
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
export class PaymentCancelKafkaEvent
	extends PaymentCancelEvent
	implements IKafkaEvent
{
	eventId: string;
}
