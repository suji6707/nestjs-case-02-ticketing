import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/common/services/prisma.service';
import { REDIS_CLIENT } from 'src/common/utils/constants';
import * as request from 'supertest';
import { PrismaServiceRef } from 'test/prisma-test-setup';
import { RedisClientRef } from 'test/redis-test-setup';
import { IUserPointRepository } from '../domain/repositories/iuser-point.repository';

describe('PaymentService Integration Test', () => {
	let app: INestApplication;
	let userPointRepository: IUserPointRepository;

	beforeAll(async () => {
		const moduleRef: TestingModule = await Test.createTestingModule({
			imports: [AppModule],
		})
			.overrideProvider(PrismaService)
			.useValue(PrismaServiceRef)
			.overrideProvider(REDIS_CLIENT)
			.useValue(RedisClientRef)
			.compile();

		app = moduleRef.createNestApplication();
		await app.init();

		userPointRepository = moduleRef.get('IUserPointRepository');
	});

	afterAll(async () => {
		await app.close();
	});

	describe('charge', () => {
		it('동시 잔액차감 충돌시 음수가 되지 않아야 한다.', async () => {
			// given
			const signupRes = await request(app.getHttpServer())
				.post('/auth/signup')
				.send({
					email: 'test@example.com',
					password: 'test',
				})
				.expect(201);

			const authToken = signupRes.body.token;

			// 충전
			const chargeAmount = 10000;
			const chargeRes = await request(app.getHttpServer())
				.patch('/payment/charge')
				.set('Authorization', `Bearer ${authToken}`)
				.send({
					amount: chargeAmount,
				})
				.expect(200);

			const amount = chargeRes.body.balance;
			expect(amount).toBe(chargeAmount);

			// when - 동시 사용
			const numThreads = 5;
			const promises = [];
			for (let i = 0; i < numThreads; i++) {
				promises.push(
					new Promise((resolve, reject) => {
						setTimeout(() => {
							request(app.getHttpServer())
								.patch('/payment/use')
								.set('Authorization', `Bearer ${authToken}`)
								.send({
									amount: 1000,
								})
								.expect(200)
								.then((res) => resolve(res))
								.catch((err) => reject(err));
						}, i * 10);
					}),
				);
			}
			const results = await Promise.allSettled(promises);

			const successResults = results.filter(
				(result) => result.status === 'fulfilled',
			);
			const failedResults = results.filter(
				(result) => result.status === 'rejected',
			);

			for (const result of successResults) {
				const res = result.value;
				// expect(res.balance).toBe(amount);
				console.log(res.body);
			}

			for (const result of failedResults) {
				console.log('fail', result.reason);
			}

			// then
			/**
			 * TODO:
			 * 1. 건당 사용금액 10000원: 하나만 성공(balance=0), 나머지는 rejected (length check)
			 * 2. 건당 사용금액 1000원: 동시 사용시 5000원이 남아야함
			 * 현재 2번 결과가 8000
			 */
			const userPoint = await userPointRepository.findOne(1);
			console.log('userPoint*****', userPoint);
			expect(userPoint.balance).toEqual(5000);
		});
	});
});
