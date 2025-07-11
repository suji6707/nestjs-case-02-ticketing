import { Test, TestingModule } from '@nestjs/testing';
import { IUserRepository } from 'src/auth/application/domain/repositories/iuser.repository';
import { AuthModule } from 'src/auth/auth.module';
import { CommonModule } from 'src/common/common.module';
import { PrismaService } from 'src/common/services/prisma.service';
import { RedisService } from 'src/common/services/redis/redis.service';
import { QUEUE_TOKEN_TTL, REDIS_CLIENT } from 'src/common/utils/constants';
import { getQueueTokenKey } from 'src/common/utils/redis-keys';
import { QueueModule } from 'src/queue/queue.module';
import { QueueConsumer } from 'src/queue/services/queue-consumer.service';
import { QueueProducer } from 'src/ticketing/infrastructure/external/queue-producer.service';
import { TestDataFactory } from 'test/factories/test-data.factory';
import { PrismaServiceRef } from 'test/prisma-test-setup';
import { RedisClientRef } from 'test/redis-test-setup';
import { TestWorkerSimulator } from 'test/utils/worker-simulator';
import { TokenStatus } from '../domain/models/token';
import { QueueTokenService } from './queue-token.service';

describe('QueueTokenService Integration Test', () => {
	let app: TestingModule;
	let queueTokenService: QueueTokenService;
	let userRepository: IUserRepository;
	let redisService: RedisService;
	let queueProducer: QueueProducer;
	let queueConsumer: QueueConsumer;

	beforeAll(async () => {
		app = await Test.createTestingModule({
			imports: [CommonModule, AuthModule, QueueModule],
			providers: [
				QueueTokenService,
				PrismaService,
				QueueProducer,
				QueueConsumer,
			],
		})
			.overrideProvider(PrismaService)
			.useValue(PrismaServiceRef)
			.overrideProvider(REDIS_CLIENT)
			.useValue(RedisClientRef)
			.compile();

		queueTokenService = app.get<QueueTokenService>(QueueTokenService);
		userRepository = app.get<IUserRepository>('IUserRepository');
		redisService = app.get<RedisService>(RedisService);
		queueProducer = app.get<QueueProducer>(QueueProducer);
		queueConsumer = app.get<QueueConsumer>(QueueConsumer);
	});

	afterAll(async () => {
		await RedisClientRef.quit();
		await app.close();
	});

	let queueToken: string;
	let userId: number;

	describe('createToken', () => {
		it('대기열 토큰을 생성한다', async () => {
			// given
			const user = await TestDataFactory.createUser(userRepository);
			userId = user.id;

			// when
			const { token } = await queueTokenService.createToken({
				userId: user.id,
				concertId: 1,
			});
			queueToken = token;

			const cacheKey = getQueueTokenKey(token);
			const status = await redisService.get(cacheKey);
			const ttl = await redisService.getTtl(cacheKey);

			// then
			expect(status).toEqual(TokenStatus.WAITING);
			expect(ttl).toBeGreaterThan(0);
			expect(ttl).toBeLessThan(QUEUE_TOKEN_TTL + 1);
		});
	});

	describe('verifyToken', () => {
		it('대기열 토큰을 검증한다', async () => {
			// given
			// when
			const result = await queueTokenService.verifyToken(
				userId,
				queueToken,
				TokenStatus.PROCESSING,
			);

			// then
			expect(result).toBe(true);
		});
	});
});
