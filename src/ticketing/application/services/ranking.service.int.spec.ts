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
import { Concert } from '../domain/models/concert';
import { Reservation, ReservationStatus } from '../domain/models/reservation';
import { Seat, SeatStatus } from '../domain/models/seat';
import { IConcertRepository } from '../domain/repositories/iconcert.repository';
import { IReservationRepository } from '../domain/repositories/ireservation.repository';
import { ISeatRepository } from '../domain/repositories/iseat.repository';
import { ITokenService } from './interfaces/itoken.service';
import { PaymentTokenService } from './payment-token.service';
import { QueueTokenService } from './queue-token.service';
import { RankingService } from './ranking.service';
import { ReservationService } from './reservation.service';
import { SeatLockService } from './seat-lock.service';

describe('RankingService', () => {
	let reservationService: ReservationService;
	let rankingService: RankingService;
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
	let redisService: RedisService;
	let paymentTokenService: PaymentTokenService;

	beforeAll(async () => {
		const module: TestingModule = await Test.createTestingModule({
			imports: [CommonModule, AuthModule, PaymentModule, QueueModule],
			providers: [
				ReservationService,
				RankingService,
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
		rankingService = module.get<RankingService>(RankingService);
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
		redisService = module.get(RedisService);
		paymentTokenService = module.get('PaymentTokenService');
	});

	const numSchedules = 3;
	const numEachSeats = 10;
	const numUsers = numSchedules * numEachSeats;
	const scheduleIds: number[] = [];
	const seatIds: number[] = [];
	let concert: Concert;

	beforeEach(async () => {
		await redisService.flushDb();

		jest.spyOn(paymentTokenService, 'verifyToken').mockResolvedValue(true);
		jest.spyOn(paymentTokenService, 'deleteToken').mockResolvedValue(true);
		jest
			.spyOn(reservationService, '_confirmWithOptimisticLock')
			.mockImplementation(async (reservationId: number) => {
				//🟡🟡동적으로 mock 생성. 하나의 schedule에 대해서만 updateRanking이 호출되지 않도록
				const seatId = reservationId;
				const scheduleId = (reservationId % numSchedules) + 1;

				const mockReservation = new Reservation({
					id: reservationId,
					userId: 1,
					seatId,
					status: ReservationStatus.CONFIRMED,
					purchasePrice: 10000,
					paidAt: new Date(),
					createdAt: new Date(),
					updatedAt: new Date(),
				});
				const mockSeat = new Seat({
					id: seatId,
					scheduleId, // 동적으로 바뀌어야함.
					className: 'A',
					price: 10000,
					status: SeatStatus.RESERVED,
				});
				return {
					reservation: mockReservation,
					seat: mockSeat,
				};
			});
		jest.spyOn(paymentService, 'use').mockResolvedValue({
			balance: 5000,
		});

		// 데이터 채워넣기 ************************************
		concert = await TestDataFactory.createConcert(concertRepository);
		for (let i = 0; i < numSchedules; i++) {
			const schedule = await TestDataFactory.createSchedule(
				concert.id,
				concertRepository,
			);
			scheduleIds.push(schedule.id);
			for (let j = 0; j < numEachSeats; j++) {
				const seat = await TestDataFactory.createSeat(
					schedule.id,
					seatRepository,
				);
				seatIds.push(seat.id);
			}
		}
		console.log('scheduleIds', scheduleIds);
		console.log('seatIds', seatIds);
	});

	it('좌석 매진시 랭킹이 정상적으로 기록된다.', async () => {
		// given
		// 판매 시작!
		await rankingService.startToSell(scheduleIds);

		// 예약 요청
		for (let i = 0; i < numUsers; i++) {
			const userId = i + 1;
			const reservationId = i + 1;
			const paymentToken = 'test';
			await reservationService.confirmReservation(
				userId,
				reservationId,
				paymentToken,
			);
		}

		// 랭킹확인
		const ranking = await rankingService.getFastSelloutRanking();
		expect(ranking).toHaveLength(3);
		expect(ranking[0].scheduleId).toBe(3);
	});

	it('랭킹을 조회한다.', async () => {
		// given
		jest
			.spyOn(redisService, 'zrange')
			.mockResolvedValue([
				'schedule:3',
				'305',
				'schedule:2',
				'341',
				'schedule:1',
				'405',
			]);
		jest.spyOn(redisService, 'get').mockImplementation((key: string) => {
			if (key.startsWith('selling_start_time')) {
				return Promise.resolve(1751670949527);
			}
			if (key.startsWith('total_seats_count')) {
				return Promise.resolve(10);
			}
		});
		const ranking = await rankingService.getFastSelloutRanking();
		expect(ranking).toHaveLength(3);
		expect(ranking[0].scheduleId).toBe(3);
	});
});
