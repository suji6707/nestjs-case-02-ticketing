import { IConcertRepository } from '../domain/repositories/iconcert.repository';
import { EventSearchService } from './event-search.service';
import { ITokenService } from './interfaces/itoken.service';

describe('EventSearchService', () => {
	let eventSearchService: EventSearchService;
	let concertRepository: IConcertRepository;
	let tokenService: ITokenService;

	beforeEach(async () => {
		concertRepository = {
			findAll: jest.fn(),
			findSchedules: jest.fn(),
			findSeats: jest.fn(),
		} as unknown as IConcertRepository;
		tokenService = {
			createToken: jest.fn(),
			verifyToken: jest.fn(),
		} as unknown as ITokenService;

		eventSearchService = new EventSearchService(
			concertRepository,
			tokenService,
		);
	});

	it('콘서트 스케줄을 반환한다', async () => {
		// given
		const userId = 1;
		const concertId = 1;
		const queueToken = 'test';

		const mockSchedules = [
			{
				id: 1,
				concertId: 1,
				basePrice: 10000,
				startAt: new Date('2025-06-01T13:00:00.000Z'),
				endAt: new Date('2025-06-01T15:00:00.000Z'),
				totalSeats: 50,
				isSoldOut: false,
			},
			{
				id: 2,
				concertId: 1,
				basePrice: 10000,
				startAt: new Date('2025-06-01T16:00:00.000Z'),
				endAt: new Date('2025-06-01T18:00:00.000Z'),
				totalSeats: 50,
				isSoldOut: false,
			},
		];
		jest
			.spyOn(concertRepository, 'findSchedules')
			.mockResolvedValue(mockSchedules);

		jest.spyOn(tokenService, 'verifyToken').mockResolvedValue(true);

		// when
		const result = await eventSearchService.getSchedules(
			userId,
			concertId,
			queueToken,
		);
		console.log(result);

		// then
		const expected = {
			schedules: expect.arrayContaining([
				expect.objectContaining({
					id: expect.any(Number),
					basePrice: expect.any(Number),
					startTime: expect.any(Date),
					endTime: expect.any(Date),
					isSoldOut: expect.any(Boolean),
				}),
			]),
		};

		expect(result).toEqual(expected);
	});
});
