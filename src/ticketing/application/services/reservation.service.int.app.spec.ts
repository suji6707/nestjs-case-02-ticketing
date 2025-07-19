import { INestApplication } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from 'src/app.module';
import { IUserPointRepository } from 'src/payment/application/domain/repositories/iuser-point.repository';
import { PaymentService } from 'src/payment/application/services/payment.service';
import { ReservationStatus } from '../domain/models/reservation';
import { SeatStatus } from '../domain/models/seat';
import { IReservationRepository } from '../domain/repositories/ireservation.repository';
import { ISeatRepository } from '../domain/repositories/iseat.repository';
import { QueueRankingService } from './queue-ranking.service';
import { QueueTokenService } from './queue-token.service';
import { ReservationService } from './reservation.service';

describe('ReservationService', () => {
	let app: INestApplication;
	let reservationService: ReservationService;
	let seatRepository: ISeatRepository;
	let userPointRepository: IUserPointRepository;
	let reservationRepository: IReservationRepository;
	let queueTokenService: QueueTokenService;
	let paymentService: PaymentService;
	let queueRankingService: QueueRankingService;

	beforeAll(async () => {
		const module: TestingModule = await Test.createTestingModule({
			imports: [AppModule],
		}).compile();

		app = module.createNestApplication();

		// 🎧 테스트에서도 Kafka Consumer 활성화 -> 이벤트 수신 못함...
		app.connectMicroservice<MicroserviceOptions>({
			transport: Transport.KAFKA,
			options: {
				client: {
					clientId: 'ticketing-consumer',
					brokers: ['localhost:9092', 'localhost:9093', 'localhost:9094'],
				},
				consumer: {
					groupId: 'ticketing-consumer-group-test', // 테스트 전용 그룹
					// Consumer 초기화 시간 단축 설정
					sessionTimeout: 10000, // 기본 30초 → 10초
					heartbeatInterval: 1000, // 기본 3초 → 1초
					maxWaitTimeInMs: 1000, // 기본 5초 → 1초
					rebalanceTimeout: 5000, // 기본 60초 → 5초
				},
			},
		});

		console.log('🚀 Kafka Consumer 시작 중...');
		await app.startAllMicroservices();
		console.log('✅ Kafka Consumer 시작 완료');

		// Consumer 연결 안정화를 위한 대기 시간 증가
		console.log('⏳ Consumer 연결 안정화 대기 중...');
		await new Promise((resolve) => setTimeout(resolve, 10000)); // 10초 대기
		console.log('✅ Consumer 연결 안정화 완료');

		reservationService = app.get<ReservationService>(ReservationService);
		seatRepository = app.get<ISeatRepository>('ISeatRepository');
		userPointRepository = app.get<IUserPointRepository>('IUserPointRepository');
		reservationRepository = app.get<IReservationRepository>(
			'IReservationRepository',
		);
		queueTokenService = app.get<QueueTokenService>('QueueTokenService');
		paymentService = app.get<PaymentService>(PaymentService);
		queueRankingService = app.get<QueueRankingService>(QueueRankingService);

		await queueRankingService.initialize();
	});

	const userId = 1;
	const concertId = 1;
	const scheduleId = 1;
	const seatId = 31;

	// 유저가 토큰을 발급받고 → 좌석 예약 요청 → 결제 완료까지의 흐름 테스트
	it('예약 흐름 테스트', async () => {
		// given
		const { token } = await queueTokenService.createToken({
			userId,
			concertId,
		});

		// 충전
		await paymentService.charge(userId, 150000);

		// 예약 요청
		const { reservationId, paymentToken } =
			await reservationService.temporaryReserve(userId, seatId, token);

		// 결제 완료 및 예약확정(이벤트)
		await paymentService.processPaymentAndReservation(
			userId,
			reservationId,
			paymentToken,
		);

		console.log('⏳ 이벤트 처리 대기 중...');
		await new Promise((resolve) => setTimeout(resolve, 5000));
		console.log('⏰ 대기 완료');

		// 예약확정 확인: 1. reservation 2. seat
		const reservation = await reservationRepository.findOne(reservationId);
		console.log('🟡reservation', reservation);
		expect(reservation).toBeDefined();
		expect(reservation.status).toBe(ReservationStatus.CONFIRMED);
		expect(reservation.paidAt).toBeInstanceOf(Date);

		const seatAfter = await seatRepository.findOne(reservation.seatId);
		expect(seatAfter.status).toBe(SeatStatus.SOLD);
	});
});
