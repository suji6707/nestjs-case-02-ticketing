import { Seat, SeatStatus } from '../models/seat';

export interface ISeatRepository {
	findOne(seatId: number): Promise<Seat>;
	selectForUpdate(seatId: number): Promise<optional<Seat>>;
	update(seat: Seat, expectedStatus: SeatStatus): Promise<Seat>;
	create(seat: Seat): Promise<Seat>;
}
