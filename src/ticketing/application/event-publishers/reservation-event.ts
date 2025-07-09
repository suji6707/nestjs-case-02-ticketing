import { IEvent } from 'src/common/interfaces/ievent-bus.interface';
import { Reservation } from '../domain/models/reservation';

export interface ReservationFailedData extends Reservation {
	errorMessage: string;
}

export class ReservationSuccessEvent implements IEvent {
	eventName = 'reservation.success';
	timestamp: Date;
	data: Reservation;

	constructor(data: Reservation) {
		this.timestamp = new Date();
		this.data = data;
	}
}

export class ReservationFailedEvent implements IEvent {
	eventName = 'reservation.failed';
	timestamp: Date;
	data: ReservationFailedData;

	constructor(data: ReservationFailedData) {
		this.timestamp = new Date();
		this.data = data;
	}
}
