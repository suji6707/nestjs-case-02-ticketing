import { Test, TestingModule } from '@nestjs/testing';
import { IUserRepository } from 'src/auth/application/domain/repositories/iuser.repository';
import { AuthModule } from 'src/auth/auth.module';
import { CommonModule } from 'src/common/common.module';
import { PrismaService } from 'src/common/services/prisma.service';
import { RedisService } from 'src/common/services/redis/redis.service';
import { QUEUE_TOKEN_TTL, REDIS_CLIENT } from 'src/common/utils/constants';
import { getQueueTokenKey } from 'src/common/utils/redis-keys';
import { QueueProducer } from 'src/ticketing/infrastructure/external/queue-producer.service';
import { TicketingModule } from 'src/ticketing/ticketing.module';
import { createUser } from 'test/factories/user.factory';
import { PrismaServiceRef } from 'test/prisma-test-setup';
import { RedisClientRef } from 'test/redis-test-setup';
import { TokenStatus } from '../domain/models/token';
import { QueueTokenService } from './queue-token.service';

describe('QueueTokenService Integration Test', () => {
	let app: TestingModule;
	let queueTokenService: QueueTokenService;
	let userRepository: IUserRepository;
	let redisService: RedisService;

	beforeAll(async () => {
		app = await Test.createTestingModule({
			imports: [CommonModule, AuthModule],
			providers: [QueueTokenService, PrismaService, QueueProducer],
		})
			.overrideProvider(PrismaService)
			.useValue(PrismaServiceRef)
			.overrideProvider(REDIS_CLIENT)
			.useValue(RedisClientRef)
			.overrideProvider(QueueProducer) // provider에 없어도 직접 override하므로 작동함
			.useFactory({
				factory: (redisService: RedisService): QueueProducer => {
					return new QueueProducer(redisService);
				},
				inject: [RedisService],
			})
			.compile();

		queueTokenService = app.get<QueueTokenService>(QueueTokenService);
		userRepository = app.get<IUserRepository>('IUserRepository');
		redisService = app.get<RedisService>(RedisService);
	});

	afterAll(async () => {
		await RedisClientRef.quit();
		await app.close();
	});

	describe('createToken', () => {
		it('대기열 토큰을 생성한다', async () => {
			// given
			const user = await createUser(userRepository);

			// when
			const { token } = await queueTokenService.createToken({
				userId: user.id,
				concertId: 1,
			});
			console.log(token);

			const cacheKey = getQueueTokenKey(token);
			const status = await redisService.get(cacheKey);
			console.log(status);
			const ttl = await redisService.getTtl(cacheKey);
			console.log(ttl);

			// then
			expect(status).toEqual(TokenStatus.WAITING);
			expect(ttl).toBeGreaterThan(0);
			expect(ttl).toBeLessThan(QUEUE_TOKEN_TTL + 1);
		});
	});
});
