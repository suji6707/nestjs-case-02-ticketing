import { IEvent } from 'src/common/interfaces/ievent-bus.interface';

export interface PaymentSuccessData {
	userId: number;
	amount: number;
	reservationId: number;
	seatId: number;
	concertId: number;
	scheduleId: number;
}

export interface PaymentFailedData extends PaymentSuccessData {
	errorMessage: string;
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

export class PaymentFailedEvent implements IEvent {
	eventName = 'payment.failed';
	timestamp: Date;
	data: PaymentFailedData;

	constructor(data: PaymentFailedData) {
		this.timestamp = new Date();
		this.data = data;
	}
}
