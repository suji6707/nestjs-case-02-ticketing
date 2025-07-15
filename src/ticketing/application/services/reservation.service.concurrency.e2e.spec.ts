import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/common/services/prisma.service';
import { RedisService } from 'src/common/services/redis/redis.service';
import { REDIS_CLIENT, SEAT_EXPIRE_TTL } from 'src/common/utils/constants';
import { initializeAndStartWorkers } from 'src/queue/main.worker';
import { QueueConsumer } from 'src/queue/services/queue-consumer.service';
import { ReservationExpireConsumer } from 'src/queue/services/reservation-expire-consumer.service';
import { QueueProducer } from 'src/ticketing/infrastructure/external/queue-producer.service';
import * as request from 'supertest';
import { TestDataFactory } from 'test/factories/test-data.factory';
import { PrismaServiceRef } from 'test/prisma-test-setup';
import { RedisClientRef } from 'test/redis-test-setup';
import { TestWorkerSimulator } from 'test/utils/worker-simulator';
import { Concert } from '../domain/models/concert';
import { ConcertSchedule } from '../domain/models/concert-schedule';
import { ReservationStatus } from '../domain/models/reservation';
import { Seat, SeatStatus } from '../domain/models/seat';
import { IConcertRepository } from '../domain/repositories/iconcert.repository';
import { IReservationRepository } from '../domain/repositories/ireservation.repository';
import { ISeatRepository } from '../domain/repositories/iseat.repository';
import { QueueTokenService } from './queue-token.service';

describe('ReservationService E2E Test', () => {
	let app: INestApplication;
	let redisService: RedisService;
	let concertRepository: IConcertRepository;
	let seatRepository: ISeatRepository;
	let reservationRepository: IReservationRepository;
	let queueProducer: QueueProducer;
	let queueConsumer: QueueConsumer;
	let queueTokenService: QueueTokenService;
	// Worker
	let reservationExpireConsumer: ReservationExpireConsumer;

	const numUsers = 5;
	const authTokens = [];
	let concert: Concert;
	let schedule: ConcertSchedule;
	let seat: Seat;

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

		/**
		 * 참고) jest test에서는 워커를 테스트 자체에서 실행시키고
		 * k6에서는 워커 프로세스를 별도로 띄워야함
		 */
		await initializeAndStartWorkers(app);

		redisService = moduleRef.get(RedisService);
		concertRepository = moduleRef.get('IConcertRepository');
		seatRepository = moduleRef.get('ISeatRepository');
		reservationRepository = moduleRef.get('IReservationRepository');
		queueProducer = moduleRef.get(QueueProducer);
		queueConsumer = moduleRef.get(QueueConsumer);
		queueTokenService = moduleRef.get('QueueTokenService');
		reservationExpireConsumer = moduleRef.get(ReservationExpireConsumer);
	});

	afterAll(async () => {
		// await new Promise((resolve) => setTimeout(resolve, 1000));
		await app.close();
	});

	beforeEach(async () => {
		await redisService.flushDb();

		concert = await TestDataFactory.createConcert(concertRepository);
		schedule = await TestDataFactory.createSchedule(
			concert.id,
			concertRepository,
		);
		seat = await TestDataFactory.createSeat(schedule.id, seatRepository);

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
	});

	// 동시성제어 옵션: 조건부 UPDATE, X-lock, 분산락
	it('동시에 여러명이 같은 좌석을 예약해도 좌석은 한 명에게만 배정되어야 한다', async () => {
		// given

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
				.expect(201); // @@@ response 자체는 에러가 아님. status code 400을 에러로 정의하면 에러임. 여기선 201이 아니면 에러로 정의. expect가 없으면 전부 fulfilled로 처리됨.

			promises.push(promise);
		}

		const results = await Promise.allSettled(promises);

		const reservations = await reservationRepository.findAll();
		console.log('reservations!!', reservations);
		expect(reservations.length).toBe(1);

		// 결제 완료
		// const res = await request(app.getHttpServer())
		// .post('/ticketing/reservation/confirm')
		// .set('Authorization', `Bearer ${successAuthToken}`)
		// .send({
		// 	reservationId,
		// 	paymentToken,
		// })
		// .expect(201);

		// const { reservation } = res.body;
		// console.log('reservation', reservation);

		// expect(reservation).toBeDefined();
		// expect(reservation.status).toBe(ReservationStatus.CONFIRMED);
		// expect(reservation.paidAt).not.toBeNull();

		// const seatAfter = await seatRepository.findOne(reservation.seatId);
		// console.log('seatAfter', seatAfter);
		// expect(seatAfter.status).toBe(SeatStatus.SOLD);

		return;
	});

	it('좌석 임시배정 만료 처리와 동시에 결제 요청시 둘 중 하나만 성공한다.', async () => {
		// given

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
			const queueToken = res.body.token;
			queueTokens.push(queueToken);
		}

		// 유저 1의 예약 요청
		const res = await request(app.getHttpServer())
			.post('/ticketing/reservation/new')
			.set('Authorization', `Bearer ${authTokens[0]}`)
			.send({
				seatId: seat.id,
				queueToken: queueTokens[0],
			})
			.expect(201);
		const { reservationId, paymentToken } = res.body;

		// 배정 만료시간 지났다고 가정
		// jest.advanceTimersByTime(SEAT_EXPIRE_TTL * 1000);

		// when

		const paymentPromise = request(app.getHttpServer())
			.post('/ticketing/reservation/confirm')
			.set('Authorization', `Bearer ${authTokens[0]}`)
			.send({
				reservationId,
				paymentToken,
			})
			.expect(201);

		const expirePromise = TestWorkerSimulator.addDelayJobAndExpire(
			queueProducer,
			reservationExpireConsumer,
			reservationId,
		);
		const promises = [paymentPromise, expirePromise];

		// then
		const results = await Promise.allSettled(promises);
		console.log('results', results);

		const reservation = await reservationRepository.findOne(reservationId);
		console.log('🟢FINAL reservation', reservation);

		expect(results.length).toBe(numUsers);
		expect(results[0].status).toBe('fulfilled');
		expect(results[1].status).toBe('rejected');
	});
});
