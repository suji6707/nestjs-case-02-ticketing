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
				number: 1,
				className: 'A',
				status: SeatStatus.AVAILABLE,
				price: 10000,
			},
		],
		[
			2,
			{
				number: 2,
				className: 'A',
				status: SeatStatus.AVAILABLE,
				price: 10000,
			},
		],
		[
			3,
			{
				number: 1,
				className: 'B',
				status: SeatStatus.AVAILABLE,
				price: 10000,
			},
		],
		[
			4,
			{
				number: 1,
				className: 'B',
				status: SeatStatus.AVAILABLE,
				price: 10000,
			},
		],
	]);

	describe('set', () => {
		it('hmset', async () => {
			// given
			const scheduleId = 1;
			const key = `schedule:${scheduleId}:seats`;
			const value = allSeats;

			const ttl = 60 * 60;

			// when
			const result = await redisService.hset(key, value, ttl);

			// then
			expect(result).toBe(true);
		});
	});

	describe('get', () => {
		it('hmget', async () => {
			// given
			const scheduleId = 1;
			const key = `schedule:${scheduleId}:seats`;
			const value = allSeats;

			// when
			const result = await redisService.hgetall(key);
			console.log('result', result);

			// then
			const expectedValue = value.get(1);
			expect(result['1']).toEqual(expectedValue);
		});
	});
});
