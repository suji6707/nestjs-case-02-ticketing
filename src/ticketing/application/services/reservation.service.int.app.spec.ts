import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from 'src/app.module';
import { IUserPointRepository } from 'src/payment/application/domain/repositories/iuser-point.repository';
import { PaymentService } from 'src/payment/application/services/payment.service';
import { ReservationStatus } from '../domain/models/reservation';
import { SeatStatus } from '../domain/models/seat';
import { ISeatRepository } from '../domain/repositories/iseat.repository';
import { QueueRankingService } from './queue-ranking.service';
import { QueueTokenService } from './queue-token.service';
import { ReservationService } from './reservation.service';

describe('ReservationService', () => {
	let app: INestApplication;
	let reservationService: ReservationService;
	let seatRepository: ISeatRepository;
	let userPointRepository: IUserPointRepository;
	let queueTokenService: QueueTokenService;
	let paymentService: PaymentService;
	let queueRankingService: QueueRankingService;

	beforeAll(async () => {
		const module: TestingModule = await Test.createTestingModule({
			imports: [AppModule],
		}).compile();

		app = module.createNestApplication();
		await app.init();

		reservationService = app.get<ReservationService>(ReservationService);
		seatRepository = app.get<ISeatRepository>('ISeatRepository');
		userPointRepository = app.get<IUserPointRepository>('IUserPointRepository');
		queueTokenService = app.get<QueueTokenService>('QueueTokenService');
		paymentService = app.get<PaymentService>(PaymentService);
		queueRankingService = app.get<QueueRankingService>(QueueRankingService);

		await queueRankingService.initialize();
	});

	const userId = 1;
	const concertId = 1;
	const scheduleId = 1;
	const seatId = 10;

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

		// 결제 완료
		const { reservation } = await reservationService.confirmReservation(
			userId,
			reservationId,
			paymentToken,
		);
		console.log('reservation', reservation);

		expect(reservation).toBeDefined();
		expect(reservation.status).toBe(ReservationStatus.CONFIRMED);
		expect(reservation.paidAt).toBeInstanceOf(Date);

		const seatAfter = await seatRepository.findOne(reservation.seatId);
		expect(seatAfter.status).toBe(SeatStatus.SOLD);

		// 이벤트 리스닝 확인
		// 1. 최종예약 -> 결제
		const userPointAfter = await userPointRepository.findOne(userId);
		console.log('userPointAfter', userPointAfter);
		// expect(userPointAfter.balance).toBe(0);
	});
});
