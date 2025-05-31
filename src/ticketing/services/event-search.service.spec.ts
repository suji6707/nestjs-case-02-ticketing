import { Test, TestingModule } from '@nestjs/testing';
import { EventSearchService } from './event-search.service';

describe('EventSearchService', () => {
	let service: EventSearchService;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [EventSearchService],
		}).compile();

		service = module.get<EventSearchService>(EventSearchService);
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});
});
