import { Test, TestingModule } from '@nestjs/testing';
import { IUserRepository } from 'src/auth/application/domain/repositories/iuser.repository';
import { AuthModule } from 'src/auth/auth.module';
import { CommonModule } from 'src/common/common.module';
import { PrismaService } from 'src/common/services/prisma.service';
import { RedisService } from 'src/common/services/redis/redis.service';
import { REDIS_CLIENT, SEAT_EXPIRE_TTL } from 'src/common/utils/constants';
import { PaymentService } from 'src/payment/application/services/payment.service';
import { PaymentModule } from 'src/payment/payment.module';
import { QueueModule } from 'src/queue/queue.module';
import { QueueConsumer } from 'src/queue/services/queue-consumer.service';
import { QueueProducer } from 'src/ticketing/infrastructure/external/queue-producer.service';
import { ConcertPrismaRepository } from 'src/ticketing/infrastructure/persistence/concert.prisma.repository';
import { ReservationPrismaRepository } from 'src/ticketing/infrastructure/persistence/reservation.prisma.repository';
import { SeatPrismaRepository } from 'src/ticketing/infrastructure/persistence/seat.prisma.repository';
import { TicketingModule } from 'src/ticketing/ticketing.module';
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

describe('ReservationService', () => {
	let reservationService: ReservationService;
	let userRepository: IUserRepository;
	let concertRepository: IConcertRepository;
	let seatRepository: ISeatRepository;
	let reservationRepository: IReservationRepository;
	let queueTokenService: QueueTokenService;
	let paymentService: PaymentService;
	let queueProducer: QueueProducer;
	let queueConsumer: QueueConsumer;
	let reservationExpireConsumer: ReservationExpireConsumer;
	let seatLockService: SeatLockService;

	beforeAll(async () => {
		const module: TestingModule = await Test.createTestingModule({
			imports: [CommonModule, AuthModule, PaymentModule, QueueModule],
			providers: [
				ReservationService,
				{
					provide: 'IConcertRepository',
					useClass: ConcertPrismaRepository,
				},
				{
					provide: 'ISeatRepository',
					useClass: SeatPrismaRepository,
				},
				{
					provide: 'IReservationRepository',
					useClass: ReservationPrismaRepository,
				},
				{
					provide: 'QueueTokenService',
					useClass: QueueTokenService,
				},
				{
					provide: 'PaymentTokenService',
					useClass: PaymentTokenService,
				},
				QueueProducer,
				QueueConsumer,
				ReservationExpireConsumer,
				SeatLockService,
			],
		})
			.overrideProvider(PrismaService)
			.useValue(PrismaServiceRef)
			.overrideProvider(REDIS_CLIENT)
			.useValue(RedisClientRef)
			.compile();

		reservationService = module.get<ReservationService>(ReservationService);
		userRepository = module.get<IUserRepository>('IUserRepository');
		concertRepository = module.get<IConcertRepository>('IConcertRepository');
		seatRepository = module.get<ISeatRepository>('ISeatRepository');
		reservationRepository = module.get<IReservationRepository>(
			'IReservationRepository',
		);
		paymentService = module.get<PaymentService>(PaymentService);
		queueTokenService = module.get<QueueTokenService>('QueueTokenService');
		queueProducer = module.get<QueueProducer>(QueueProducer);
		queueConsumer = module.get<QueueConsumer>(QueueConsumer);
		reservationExpireConsumer = module.get<ReservationExpireConsumer>(
			ReservationExpireConsumer,
		);
		seatLockService = module.get<SeatLockService>(SeatLockService);
	});

	// 유저가 토큰을 발급받고 → 좌석 예약 요청 → 결제 완료까지의 흐름 테스트
	it('예약 흐름 테스트', async () => {
		// given
		const user = await TestDataFactory.createUser(userRepository);
		const concert = await TestDataFactory.createConcert(concertRepository);
		const schedule = await TestDataFactory.createSchedule(
			concert.id,
			concertRepository,
		);
		const seat = await TestDataFactory.createSeat(schedule.id, seatRepository);

		const { token } = await queueTokenService.createToken({
			userId: user.id,
			concertId: concert.id,
		});

		// 충전
		await paymentService.charge(user.id, 10000);

		// 대기열 진입
		await TestWorkerSimulator.addJobAndStartProcess(
			queueProducer,
			queueConsumer,
			queueTokenService,
			concert.id,
			token,
		);

		// 예약 요청
		const { reservationId, paymentToken } =
			await reservationService.temporaryReserve(user.id, seat.id, token);

		// 결제 완료
		const { reservation } = await reservationService.confirmReservation(
			user.id,
			reservationId,
			paymentToken,
		);
		console.log('reservation', reservation);

		expect(reservation).toBeDefined();
		expect(reservation.status).toBe(ReservationStatus.CONFIRMED);
		expect(reservation.paidAt).toBeInstanceOf(Date);

		const seatAfter = await seatRepository.findOne(reservation.seatId);
		expect(seatAfter.status).toBe(SeatStatus.SOLD);
	});

	it('좌석 임시배정 시간 만료 후 좌석은 다시 예약 가능해야 한다', async () => {
		jest.useFakeTimers();

		// given
		const user = await TestDataFactory.createUser(userRepository);
		const concert = await TestDataFactory.createConcert(concertRepository);
		const schedule = await TestDataFactory.createSchedule(
			concert.id,
			concertRepository,
		);
		const seat = await TestDataFactory.createSeat(schedule.id, seatRepository);

		const { token } = await queueTokenService.createToken({
			userId: user.id,
			concertId: concert.id,
		});

		// 대기열 진입
		await TestWorkerSimulator.addJobAndStartProcess(
			queueProducer,
			queueConsumer,
			queueTokenService,
			concert.id,
			token,
		);

		// 예약 요청
		const { reservationId } = await reservationService.temporaryReserve(
			user.id,
			seat.id,
			token,
		);

		const isLocked = await seatLockService.isLocked(seat.id);
		expect(isLocked).toBe(true);

		// when
		// 5분 후 임시배정 만료처리하는 워커 호출
		await TestWorkerSimulator.addDelayJobAndExpire(
			queueProducer,
			reservationExpireConsumer,
			reservationId,
		);

		// Fast-forward time by 5 minutes
		jest.advanceTimersByTime(SEAT_EXPIRE_TTL * 1000);
		await Promise.resolve();

		// then
		// 좌석 락은 풀리고 임시배정은 만료된다
		const isLockedAfter = await seatLockService.isLocked(seat.id);
		expect(isLockedAfter).toBe(false);

		const reservation = await reservationRepository.findOne(reservationId);
		expect(reservation).toBeDefined();
		expect(reservation.status).toBe(ReservationStatus.EXPIRED);
		expect(reservation.paidAt).toBeNull();

		const seatAfter = await seatRepository.findOne(seat.id);
		expect(seatAfter.status).toBe(SeatStatus.AVAILABLE);
	});
});

/**
 * ============== TODO ==============
 * 예약 요청 시나리오
 * 0. redis에 대기열 토큰이 있는지 검증한다.
 * 1. 좌석이 이미 배정되어있으면 에러를 반환한다.
 * 2. 좌석이 배정상태가 아니면 배정 후 reservation 생성, 임시 결제토큰을 받는다.
 * 3. 트랜잭션: 예약 생성에 실패한 경우 seat status 변경이 롤백된다.
 *
 * 결제 요청 시나리오
 * 0. redis에 결제 토큰이 있는지 검증한다.
 * 1. 잔액이 충분하면 포인트를 차감하고,
 * - reservation, seat 업데이트
 * - 대기열 토큰 및 결제 토큰 삭제
 */
