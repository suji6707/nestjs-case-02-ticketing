import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from 'src/app.module';
import { User } from 'src/auth/application/domain/models/user';
import { IUserRepository } from 'src/auth/application/domain/repositories/iuser.repository';
import { AuthModule } from 'src/auth/auth.module';
import { CommonModule } from 'src/common/common.module';
import { PrismaService } from 'src/common/services/prisma.service';
import { RedisService } from 'src/common/services/redis/redis.service';
import { REDIS_CLIENT, SEAT_LOCK_TTL } from 'src/common/utils/constants';
import { PaymentService } from 'src/payment/application/services/payment.service';
import { PaymentModule } from 'src/payment/payment.module';
import { initializeAndStartWorkers } from 'src/queue/main.worker';
import { QueueModule } from 'src/queue/queue.module';
import { QueueConsumer } from 'src/queue/services/queue-consumer.service';
import { QueueProducer } from 'src/ticketing/infrastructure/external/queue-producer.service';
import { ConcertPrismaRepository } from 'src/ticketing/infrastructure/persistence/concert.prisma.repository';
import { ReservationPrismaRepository } from 'src/ticketing/infrastructure/persistence/reservation.prisma.repository';
import { SeatPrismaRepository } from 'src/ticketing/infrastructure/persistence/seat.prisma.repository';
import { TicketingModule } from 'src/ticketing/ticketing.module';
import * as request from 'supertest';
import { TestDataFactory } from 'test/factories/test-data.factory';
import { PrismaServiceRef } from 'test/prisma-test-setup';
import { RedisClientRef } from 'test/redis-test-setup';
import { TestWorkerSimulator } from 'test/utils/worker-simulator';
import { ReservationExpireConsumer } from '../../../queue/services/reservation-expire-consumer.service';
import { ReservationStatus } from '../domain/models/reservation';
import { SeatStatus } from '../domain/models/seat';
import { IConcertRepository } from '../domain/repositories/iconcert.repository';
import { IReservationRepository } from '../domain/repositories/ireservation.repository';
import { ISeatRepository } from '../domain/repositories/iseat.repository';
import { ITokenService } from './interfaces/itoken.service';
import { PaymentTokenService } from './payment-token.service';
import { QueueTokenService } from './queue-token.service';
import { ReservationService } from './reservation.service';
import { SeatLockService } from './seat-lock.service';

describe('ReservationService E2E Test', () => {
	let app: INestApplication;
	let redisService: RedisService;
	let userRepository: IUserRepository;
	let concertRepository: IConcertRepository;
	let seatRepository: ISeatRepository;
	let reservationRepository: IReservationRepository;
	let queueProducer: QueueProducer;
	let queueConsumer: QueueConsumer;
	let queueTokenService: QueueTokenService;

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

		await initializeAndStartWorkers(app);

		redisService = moduleRef.get(RedisService);
		userRepository = moduleRef.get('IUserRepository');
		concertRepository = moduleRef.get('IConcertRepository');
		seatRepository = moduleRef.get('ISeatRepository');
		reservationRepository = moduleRef.get('IReservationRepository');
		queueProducer = moduleRef.get(QueueProducer);
		queueConsumer = moduleRef.get(QueueConsumer);
		queueTokenService = moduleRef.get('QueueTokenService');
	});

	afterAll(async () => {
		// await new Promise((resolve) => setTimeout(resolve, 1000));
		await app.close();
	});

	beforeEach(async () => {
		await redisService.flushDb();
	});

	it('동시에 여러명이 같은 좌석을 예약해도 좌석은 한 명에게만 배정되어야 한다', async () => {
		// given
		const numUsers = 10;

		const concert = await TestDataFactory.createConcert(concertRepository);
		const schedule = await TestDataFactory.createSchedule(
			concert.id,
			concertRepository,
		);
		const seat = await TestDataFactory.createSeat(schedule.id, seatRepository);

		const authTokens = [];
		for (let i = 0; i < numUsers; i++) {
			const res = await request(app.getHttpServer())
				.post('/auth/signup')
				.send({
					email: `test${i}@example.com`,
					password: 'test',
				})
				.expect(201);

			authTokens.push(res.body.token);
		}

		for (let i = 0; i < numUsers; i++) {
			const res = await request(app.getHttpServer())
				.patch('/payment/charge')
				.set('Authorization', `Bearer ${authTokens[i]}`)
				.send({
					amount: 10000,
				});
			expect(res.status).toEqual(200);
			expect(res.body.balance).toEqual(10000);
		}

		// 대기열 진입
		const queueTokens = [];
		for (let i = 0; i < numUsers; i++) {
			const res = await request(app.getHttpServer())
				.post('/ticketing/reservation/token')
				.set('Authorization', `Bearer ${authTokens[i]}`)
				.send({
					concertId: concert.id,
				})
				.expect(201);

			queueTokens.push(res.body.token);
		}

		// 대기열 통과
		for (let i = 0; i < numUsers; i++) {
			await TestWorkerSimulator.addJobAndStartProcess(
				queueProducer,
				queueConsumer,
				queueTokenService,
				concert.id,
				queueTokens[i],
			);
		}

		// 동시 예약 요청
		const promises = [];
		for (let i = 0; i < numUsers; i++) {
			const promise = request(app.getHttpServer())
				.post('/ticketing/reservation/new')
				.set('Authorization', `Bearer ${authTokens[i]}`)
				.send({
					seatId: seat.id,
					queueToken: queueTokens[i],
				})
				.expect(201);

			promises.push(promise);
		}

		const results = await Promise.allSettled(promises);

		const successReservations = results.filter(
			(result) => result.status === 'fulfilled',
		);
		const failedReservations = results.filter(
			(result) => result.status === 'rejected',
		);

		// 하나만 성공
		expect(successReservations.length).toBe(1);
		expect(failedReservations.length).toBe(numUsers - 1);

		// 성공한 유저 예약정보 확인
		const successData = successReservations[0].value.body;
		const { reservationId, paymentToken } = successData;

		const tempReservation = await reservationRepository.findOne(reservationId);
		expect(tempReservation.status).toBe(ReservationStatus.PENDING);
		expect(tempReservation.paidAt).toBeNull();
		const userId = tempReservation.userId;
		console.log('userId', userId);

		const seatBefore = await seatRepository.findOne(seat.id);
		expect(seatBefore.status).toBe(SeatStatus.RESERVED);
		console.log('seatBefore', seatBefore);

		const successIndex = results.findIndex(
			(result) => result.status === 'fulfilled',
		);
		const successAuthToken = authTokens[successIndex];

		// 결제 완료
		const res = await request(app.getHttpServer())
			.post('/ticketing/reservation/confirm')
			.set('Authorization', `Bearer ${successAuthToken}`)
			.send({
				reservationId,
				paymentToken,
			})
			.expect(201);

		const { reservation } = res.body;
		console.log('reservation', reservation);

		expect(reservation).toBeDefined();
		expect(reservation.status).toBe(ReservationStatus.CONFIRMED);
		expect(reservation.paidAt).not.toBeNull();

		const seatAfter = await seatRepository.findOne(reservation.seatId);
		console.log('seatAfter', seatAfter);
		expect(seatAfter.status).toBe(SeatStatus.SOLD);

		return;
	});
});
