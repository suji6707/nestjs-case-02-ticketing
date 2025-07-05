import { Concert } from '../models/concert';
import { ConcertSchedule } from '../models/concert-schedule';
import { Seat } from '../models/seat';

export interface IConcertRepository {
	findConcerts(): Promise<Concert[]>;
	findSchedules(concertId: number): Promise<ConcertSchedule[]>;
	findOneSchedule(scheduleId: number): Promise<ConcertSchedule>;
	findManySchedules(scheduleIds: number[]): Promise<ConcertSchedule[]>;
	findSeats(scheduleId: number): Promise<Seat[]>;
	createConcert(concert: Concert): Promise<Concert>;
	createSchedule(schedule: ConcertSchedule): Promise<ConcertSchedule>;
}
