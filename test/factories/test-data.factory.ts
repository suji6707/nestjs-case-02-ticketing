import { User } from 'src/auth/application/domain/models/user';
import { IUserRepository } from 'src/auth/application/domain/repositories/iuser.repository';
import { Concert } from 'src/ticketing/application/domain/models/concert';
import { ConcertSchedule } from 'src/ticketing/application/domain/models/concert-schedule';
import { SeatStatus } from 'src/ticketing/application/domain/models/seat';
import { Seat } from 'src/ticketing/application/domain/models/seat';
import { IConcertRepository } from 'src/ticketing/application/domain/repositories/iconcert.repository';
import { ISeatRepository } from 'src/ticketing/application/domain/repositories/iseat.repository';

export class TestDataFactory {
	private constructor() {}

	static async createUser(userRepository: IUserRepository): Promise<User> {
		const user = new User({
			email: `test_${new Date().getTime()}@example.com`,
			encryptedPassword: 'test_password',
		});

		return userRepository.save(user);
	}

	static async createConcert(
		concertRepository: IConcertRepository,
	): Promise<Concert> {
		const concert = new Concert({
			title: 'test_concert',
			description: 'test_description',
		});
		return concertRepository.createConcert(concert);
	}

	static async createSchedule(
		concertId: number,
		concertRepository: IConcertRepository,
	): Promise<ConcertSchedule> {
		const concertSchedule = new ConcertSchedule({
			concertId,
			basePrice: 10000,
			startAt: new Date(),
			endAt: new Date(),
			totalSeats: 10,
			isSoldOut: false,
		});
		return concertRepository.createSchedule(concertSchedule);
	}

	static async createSeat(
		scheduleId: number,
		seatRepository: ISeatRepository,
	): Promise<Seat> {
		const seat = new Seat({
			scheduleId,
			number: 50,
			className: 'A1',
			price: 10000,
			status: SeatStatus.AVAILABLE,
		});
		return seatRepository.create(seat);
	}
}
