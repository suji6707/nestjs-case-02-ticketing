import { ReservationStatus } from '../domain/models/reservation';
import { SeatStatus } from '../domain/models/seat';
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

	beforeEach(async () => {
		seatRepository = {
			updateStatus: jest.fn(),
		} as unknown as ISeatRepository;
		reservationRepository = {
			create: jest.fn(),
		} as unknown as IReservationRepository;
		queueTokenService = {
			createToken: jest.fn(),
			verifyToken: jest.fn(),
		} as unknown as ITokenService;
		paymentTokenService = {
			createToken: jest.fn(),
			verifyToken: jest.fn(),
		} as unknown as ITokenService;
		seatLockService = {
			lockSeat: jest.fn(),
			unlockSeat: jest.fn(),
		} as unknown as SeatLockService;

		service = new ReservationService(
			seatRepository,
			reservationRepository,
			queueTokenService,
			paymentTokenService,
			seatLockService,
		);
	});

	it('좌석이 비어있으면 정상적으로 예약한다', async () => {
		// given
		const userId = 1;
		const seatId = 1;

		jest.spyOn(queueTokenService, 'verifyToken').mockResolvedValue(true);
		jest.spyOn(seatLockService, 'lockSeat').mockResolvedValue(true);
		jest.spyOn(paymentTokenService, 'createToken').mockResolvedValue({
			token: 'payment-token',
		});
		const mockSeat = {
			id: 55,
			scheduleId: 1,
			number: 5,
			className: 'A',
			price: 10000,
			status: SeatStatus.RESERVED,
		};
		jest.spyOn(seatRepository, 'updateStatus').mockResolvedValue(mockSeat);
		const mockReservation = {
			id: 65,
			userId,
			seatId,
			status: ReservationStatus.PENDING,
			purchasePrice: 10000,
			paidAt: new Date(),
			createdAt: new Date(),
		};
		jest
			.spyOn(reservationRepository, 'create')
			.mockResolvedValue(mockReservation);

		// when
		const result = await service.reserve(userId, seatId, 'queue-token');

		// then
		const expected = {
			reservationId: 65,
			paymentToken: 'payment-token',
		};
		expect(result).toEqual(expected);
	});
});
