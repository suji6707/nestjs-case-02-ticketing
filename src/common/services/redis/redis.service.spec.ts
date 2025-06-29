import { Test, TestingModule } from '@nestjs/testing';
import { CommonModule } from 'src/common/common.module';
import { SeatStatus } from 'src/ticketing/application/domain/models/seat';
import { RedisService } from './redis.service';

describe('RedisService', () => {
	let app: TestingModule;
	let redisService: RedisService;

	beforeAll(async () => {
		app = await Test.createTestingModule({
			imports: [CommonModule],
		}).compile();

		redisService = app.get<RedisService>(RedisService);
	});

	afterAll(async () => {
		await app.close();
	});

	const allSeats = new Map([
		[
			1,
			{
				className: 'A1',
				status: SeatStatus.AVAILABLE,
				price: 10000,
			},
		],
		[
			2,
			{
				className: 'A2',
				status: SeatStatus.AVAILABLE,
				price: 10000,
			},
		],
		[
			3,
			{
				className: 'B1',
				status: SeatStatus.AVAILABLE,
				price: 10000,
			},
		],
		[
			4,
			{
				className: 'B2',
				status: SeatStatus.AVAILABLE,
				price: 10000,
			},
		],
	]);

	const scheduleId = 4;

	describe('hashmap', () => {
		it('hset', async () => {
			// given
			const key = `schedule:${scheduleId}:seats`;
			const value = allSeats;

			const ttl = 60 * 60;

			// when
			const result = await redisService.hset(key, value, ttl);

			// then
			expect(result).toBe(true);
		});

		it('hgetall', async () => {
			// given
			const key = `schedule:${scheduleId}:seats`;
			const value = allSeats;

			// when
			const result = await redisService.hgetall(key);
			console.log('result', result);

			// then
			const expectedValue = value.get(1);
			expect(result['1']).toEqual(expectedValue);
		});

		it('_buildHsetQuery', async () => {
			// given
			const key = `schedule:${scheduleId}:seats`;
			const obj = {
				1: {
					className: 'A1',
					price: 150000,
					status: SeatStatus.AVAILABLE,
				},
				12: {
					className: 'B2',
					price: 120000,
					status: SeatStatus.AVAILABLE,
				},
			};

			// when
			const query = redisService._buildHsetQuery(key, obj);

			// then
			expect(query).toEqual([
				key,
				'1',
				JSON.stringify(obj['1']),
				'12',
				JSON.stringify(obj['12']),
			]);
		});
	});
});
