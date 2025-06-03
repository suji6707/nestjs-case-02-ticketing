import { Concert } from '../../domain/models/concert';
import { ConcertSchedule } from '../../domain/models/concert-schedule';
import { Seat } from '../../domain/models/seat';

export interface IConcertRepository {
	findConcerts(): Promise<Concert[]>;
	findSchedules(concertId: number): Promise<ConcertSchedule[]>;
	findSeats(scheduleId: number): Promise<Seat[]>;
	findSeatById(seatId: number): Promise<Seat>;
}
