import { Seat } from '../models/seat';

export interface ISeatRepository {
	findOne(seatId: number): Promise<Seat>;
	update(seat: Seat): Promise<Seat>;
	create(seat: Seat): Promise<Seat>;
}
