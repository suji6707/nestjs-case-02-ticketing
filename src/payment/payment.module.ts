import { Module } from '@nestjs/common';
import { PaymentService } from './application/services/payment.service';
import { PaymentController } from './constrollers/payment.controller';
import { PointHistoryPrismaRepository } from './infrastructure/persistence/point-history.repository';
import { UserPointPrismaRepository } from './infrastructure/persistence/user-point.repository';

@Module({
	controllers: [PaymentController],
	providers: [
		PaymentService,
		{ provide: 'IUserPointRepository', useClass: UserPointPrismaRepository },
		{
			provide: 'IPointHistoryRepository',
			useClass: PointHistoryPrismaRepository,
		},
	],
	exports: [PaymentService],
})
export class PaymentModule {}
