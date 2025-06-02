import { Test, TestingModule } from '@nestjs/testing';
import { EventSearchService } from './event-search.service';
import { RedisService } from 'src/common/services/redis/redis.service';

describe('EventSearchService', () => {
	let eventSearchService: EventSearchService;
	let redisService: RedisService;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [EventSearchService, RedisService],
		}).compile();

		eventSearchService = module.get<EventSearchService>(EventSearchService);
	});

	it('콘서트 스케줄을 반환한다', () => {
		// given
		const userId = 1;
		const concertId = 1;
		const queueToken = 'test';

		// when
		const result = eventSearchService.getSchedules(
			userId,
			concertId,
			queueToken,
		);

		// then

		expect(result).toBeDefined();
	});
});
