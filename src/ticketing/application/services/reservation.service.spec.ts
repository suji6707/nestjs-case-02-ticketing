import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { PaymentService } from 'src/payment/application/services/payment.service';
import { Reservation, ReservationStatus } from '../domain/models/reservation';
import { Seat, SeatStatus } from '../domain/models/seat';
import { IReservationRepository } from '../domain/repositories/ireservation.repository';
import { ISeatRepository } from '../domain/repositories/iseat.repository';
import { ITokenService } from './interfaces/itoken.service';
import { ReservationService } from './reservation.service';
import { SeatLockService } from './seat-lock.service';

jest.mock('@nestjs-cls/transactional', () => ({
	Transactional: () => (): any => {},
}));

describe('ReservationService', () => {
	let service: ReservationService;
	let seatRepository: ISeatRepository;
	let reservationRepository: IReservationRepository;
	let queueTokenService: ITokenService;
	let paymentTokenService: ITokenService;
	let seatLockService: SeatLockService;
	let paymentService: PaymentService;
	let txHost: TransactionHost<TransactionalAdapterPrisma>;

	let mockReservation: Reservation;
	let mockSeat: Seat;

	beforeEach(async () => {
		txHost = {
			withTransaction: jest.fn((fn) => fn()),
		} as unknown as TransactionHost<TransactionalAdapterPrisma>;
		seatRepository = {
			findOne: jest.fn(),
			update: jest.fn(),
		} as unknown as ISeatRepository;
		reservationRepository = {
			create: jest.fn(),
			findOne: jest.fn(),
			update: jest.fn(),
		} as unknown as IReservationRepository;
		queueTokenService = {
			createToken: jest.fn(),
			verifyToken: jest.fn(),
			deleteToken: jest.fn(),
		} as unknown as ITokenService;
		paymentTokenService = {
			createToken: jest.fn(),
			verifyToken: jest.fn(),
			deleteToken: jest.fn(),
		} as unknown as ITokenService;
		seatLockService = {
			lockSeat: jest.fn(),
			unlockSeat: jest.fn(),
		} as unknown as SeatLockService;
		paymentService = {
			charge: jest.fn(),
			use: jest.fn(),
		} as unknown as PaymentService;

		service = new ReservationService(
			seatRepository,
			reservationRepository,
			queueTokenService,
			paymentTokenService,
			seatLockService,
			paymentService,
			txHost,
		);

		jest.useFakeTimers().setSystemTime(new Date(2025, 6, 5, 12, 0, 0));

		mockReservation = new Reservation({
			id: 10,
			userId: 1,
			seatId: 55,
			purchasePrice: 10000,
			status: ReservationStatus.PENDING, // 결제 전
			paidAt: null,
			createdAt: new Date(),
		});
		mockSeat = new Seat({
			id: 55,
			scheduleId: 1,
			number: 5,
			className: 'A',
			price: 10000,
			status: SeatStatus.RESERVED,
		});
	});

	it('좌석이 비어있으면 정상적으로 예약한다', async () => {
		// given
		const userId = 1;
		const seatId = 55;

		jest.spyOn(queueTokenService, 'verifyToken').mockResolvedValue(true);
		jest.spyOn(seatLockService, 'lockSeat').mockResolvedValue(true);
		jest.spyOn(paymentTokenService, 'createToken').mockResolvedValue({
			token: 'payment-token',
		});
		jest.spyOn(seatRepository, 'update').mockResolvedValue(mockSeat);
		jest
			.spyOn(reservationRepository, 'create')
			.mockResolvedValue(mockReservation);

		jest.spyOn(queueTokenService, 'deleteToken').mockResolvedValue(true);
		jest.spyOn(seatRepository, 'findOne').mockResolvedValue(mockSeat);

		// when
		const result = await service.temporaryReserve(
			userId,
			seatId,
			'queue-token',
		);

		// then
		const expected = {
			reservationId: 10,
			paymentToken: 'payment-token',
		};
		expect(result).toEqual(expected);
	});

	it('좌석이 이미 예약되어 있으면 예약에 실패한다', async () => {
		// given
		const userId = 1;
		const seatId = 1;
		jest.spyOn(queueTokenService, 'verifyToken').mockResolvedValue(true);
		jest.spyOn(seatLockService, 'lockSeat').mockResolvedValue(false);
		// when
		await expect(
			service.temporaryReserve(userId, seatId, 'queue-token'),
		).rejects.toThrow('ALREADY_RESERVED');
	});

	// paymentService.use는 mock, 여기서 검증하지 않음
	it('결제 요청시 정상적으로 결제된다.', async () => {
		// given
		const userId = 1;
		jest.spyOn(paymentTokenService, 'verifyToken').mockResolvedValue(true);
		jest
			.spyOn(reservationRepository, 'findOne')
			.mockResolvedValue(mockReservation);
		jest.spyOn(paymentService, 'use').mockResolvedValue({
			balance: 5000, // 15000 - 10000
		});
		jest.spyOn(seatRepository, 'findOne').mockResolvedValue(mockSeat);

		// domain logic
		// mockSeat.status = SeatStatus.SOLD;
		// mockReservation.status = ReservationStatus.CONFIRMED;
		// mockReservation.paidAt = new Date();

		jest
			.spyOn(seatRepository, 'update')
			.mockImplementation(async (toUpdate) => toUpdate);
		jest
			.spyOn(reservationRepository, 'update')
			.mockImplementation(async (toUpdate) => toUpdate);
		jest.spyOn(paymentTokenService, 'deleteToken').mockResolvedValue(true);

		// when
		const result = await service.confirmReservation(
			userId,
			mockReservation.id,
			'payment-token',
		);

		// then
		const expected = {
			reservation: {
				id: mockReservation.id,
				seatId: mockReservation.seatId,
				purchasePrice: mockReservation.purchasePrice,
				paidAt: new Date(),
			},
		};
		expect(result).toEqual(expected);

		expect(seatRepository.update).toHaveBeenCalledWith(
			expect.objectContaining({
				id: mockSeat.id,
				status: SeatStatus.SOLD,
			}),
		);
		expect(reservationRepository.update).toHaveBeenCalledWith(
			expect.objectContaining({
				id: mockReservation.id,
				status: ReservationStatus.CONFIRMED,
				paidAt: expect.any(Date),
			}),
		);
	});
});
