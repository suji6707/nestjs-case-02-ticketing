import { Test, TestingModule } from '@nestjs/testing';
import { QueueProducer } from './queue.producer.service';

describe('QueueProducer', () => {
	let service: QueueProducer;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [QueueProducer],
		}).compile();

		service = module.get<QueueProducer>(QueueProducer);
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});
});
