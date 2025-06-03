import { Seat, SeatStatus } from '../models/seat';

export interface ISeatRepository {
	findSeatById(seatId: number): Promise<Seat>;
	updateStatus(seatId: number, status: SeatStatus): Promise<boolean>;
}
