import { Concert } from '../models/concert';
import { ConcertSchedule } from '../models/concert-schedule';
import { Seat } from '../models/seat';

export interface IConcertRepository {
	findAllConcerts(): Promise<Concert[]>;
	findSchedules(concertId: number): Promise<ConcertSchedule[]>;
	findSeats(scheduleId: number): Promise<Seat[]>;
}
