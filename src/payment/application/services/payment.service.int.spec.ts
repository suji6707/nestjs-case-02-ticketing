import { Test, TestingModule } from '@nestjs/testing';
import { IUserRepository } from 'src/auth/application/domain/repositories/iuser.repository';
import { AuthModule } from 'src/auth/auth.module';
import { CommonModule } from 'src/common/common.module';
import { PrismaService } from 'src/common/services/prisma.service';
import { PointHistoryPrismaRepository } from 'src/payment/infrastructure/persistence/point-history.repository';
import { UserPointPrismaRepository } from 'src/payment/infrastructure/persistence/user-point.repository';
import { createUser } from 'test/factories/user.factory';
import { PrismaServiceRef } from 'test/prisma-test-setup';
import { PaymentService } from './payment.service';

describe('PaymentService Integration Test', () => {
	let app: TestingModule;
	let paymentService: PaymentService;
	let userRepository: IUserRepository;

	beforeAll(async () => {
		app = await Test.createTestingModule({
			imports: [CommonModule, AuthModule],
			providers: [
				PaymentService,
				PrismaService,
				{
					provide: 'IUserPointRepository',
					useClass: UserPointPrismaRepository,
				},
				{
					provide: 'IPointHistoryRepository',
					useClass: PointHistoryPrismaRepository,
				},
			],
		})
			.overrideProvider(PrismaService)
			.useValue(PrismaServiceRef)
			.compile();

		paymentService = app.get<PaymentService>(PaymentService);
		userRepository = app.get<IUserRepository>('IUserRepository');
	});

	afterAll(async () => {
		await app.close();
	});

	describe('charge', () => {
		it('정상적으로 충전한다.', async () => {
			// given
			const amount = 100;
			const user = await createUser(userRepository);

			// when
			const result = await paymentService.charge(user.id, amount);

			// then
			expect(result).toEqual({ balance: amount });
		});
	});

	describe('use', () => {
		it('정상적으로 사용한다.', async () => {
			// given
			const amount = 100;
			const user = await createUser(userRepository);

			// when
			const chargeResult = await paymentService.charge(user.id, amount);
			const useResult = await paymentService.use(user.id, amount);

			// then
			expect(chargeResult).toEqual({ balance: amount });
			expect(useResult).toEqual({ balance: 0 });
		});
	});
});
