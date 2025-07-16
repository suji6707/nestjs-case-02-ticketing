import {
	IEvent,
	IKafkaEvent,
} from 'src/common/interfaces/ievent-bus.interface';
import { Reservation } from '../domain/models/reservation';

export class ReservationSuccessEvent implements IEvent {
	eventName = 'reservation.success';
	timestamp: Date;
	data: Reservation;

	constructor(data: Reservation) {
		this.timestamp = new Date();
		this.data = data;
	}
}

export class ReservationSuccessKafkaEvent
	extends ReservationSuccessEvent
	implements IKafkaEvent
{
	eventId: string;
}
