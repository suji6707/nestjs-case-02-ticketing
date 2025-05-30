import { Test, TestingModule } from '@nestjs/testing';
import { EventSearchController } from './event-search.controller';

describe('EventSearchController', () => {
	let controller: EventSearchController;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [EventSearchController],
		}).compile();

		controller = module.get<EventSearchController>(EventSearchController);
	});

	it('should be defined', () => {
		expect(controller).toBeDefined();
	});
});
