import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { UserPoint } from '../domain/models/user-point';
import {
	IPointHistoryRepository,
	PointHistoryType,
} from '../domain/repositories/ipoint-history.repository';
import { IUserPointRepository } from '../domain/repositories/iuser-point.repository';
import { PaymentService } from './payment.service';

describe('PaymentService', () => {
	let service: PaymentService;
	let txHost: TransactionHost<TransactionalAdapterPrisma>;
	let userPointRepository: IUserPointRepository;
	let pointHistoryRepository: IPointHistoryRepository;

	let mockUserPoint: UserPoint;

	beforeEach(async () => {
		txHost = {
			withTransaction: jest.fn((fn) => fn()),
		} as unknown as TransactionHost<TransactionalAdapterPrisma>;
		userPointRepository = {
			create: jest.fn(),
			findOne: jest.fn(),
			update: jest.fn(),
		};
		pointHistoryRepository = {
			create: jest.fn(),
			getByUserId: jest.fn(),
		};
		service = new PaymentService(
			txHost,
			userPointRepository,
			pointHistoryRepository,
		);

		mockUserPoint = new UserPoint({
			id: 1,
			userId: 1,
			balance: 0,
			createdAt: new Date(),
			updatedAt: new Date(),
		});
	});

	it('포인트가 정상적으로 충전된다.', async () => {
		// given
		const userId = 1;
		const amount = 100;

		// when
		// if not exist, create
		jest.spyOn(userPointRepository, 'findOne').mockResolvedValue(null);
		jest.spyOn(userPointRepository, 'create').mockResolvedValue(mockUserPoint);

		// point history create
		const mockPointHistory = {
			id: 1,
			userId,
			type: PointHistoryType.CHARGE,
			amount,
			createdAt: new Date(),
			updatedAt: new Date(),
		};
		jest
			.spyOn(pointHistoryRepository, 'create')
			.mockResolvedValue(mockPointHistory);

		// user point update
		const newMockUserPoint = new UserPoint({ ...mockUserPoint });
		newMockUserPoint.charge(amount);
		jest
			.spyOn(userPointRepository, 'update')
			.mockResolvedValue(newMockUserPoint);

		const result = await service.charge(userId, amount);

		// then
		expect(result).toBeDefined();
		expect(userPointRepository.create).toHaveBeenCalledWith(userId);
		expect(pointHistoryRepository.create).toHaveBeenCalledWith(
			userId,
			PointHistoryType.CHARGE,
			amount,
		);
		expect(userPointRepository.update).toHaveBeenCalledWith(mockUserPoint);

		expect(result).toEqual({ balance: amount });
	});

	it('잔액이 충분하면 정상적으로 결제된다.', async () => {
		// given
		const userId = 1;
		const amount = 100;

		// when
		jest.spyOn(userPointRepository, 'findOne').mockResolvedValue(mockUserPoint);
		mockUserPoint.charge(amount * 2); // charge first

		const newMockUserPoint = new UserPoint({ ...mockUserPoint });
		newMockUserPoint.use(amount);
		jest
			.spyOn(userPointRepository, 'update')
			.mockResolvedValue(newMockUserPoint);

		const result = await service.use(userId, amount);

		// then
		expect(result).toEqual({ balance: amount });
	});

	it('잔액이 부족하면 결제가 실패한다.', async () => {
		// given
		const userId = 1;
		const amount = 100;

		// when
		jest.spyOn(userPointRepository, 'findOne').mockResolvedValue(mockUserPoint);

		// then
		await expect(service.use(userId, amount)).rejects.toThrow(
			'NOT_ENOUGH_POINT',
		);
	});
});
