import { Module, forwardRef } from '@nestjs/common';
import { DataPlatformModule } from '../data-platform/data-platform.module';
import { TicketingModule } from '../ticketing/ticketing.module';
import { PaymentEventPublisher } from './application/event-publishers/payment-event.publisher';
import { PaymentService } from './application/services/payment.service';
import { PaymentController } from './constrollers/payment.controller';
import { PointHistoryPrismaRepository } from './infrastructure/persistence/point-history.repository';
import { UserPointPrismaRepository } from './infrastructure/persistence/user-point.repository';

@Module({
	imports: [forwardRef(() => TicketingModule), DataPlatformModule],
	controllers: [PaymentController],
	providers: [
		PaymentService,
		{ provide: 'IUserPointRepository', useClass: UserPointPrismaRepository },
		{
			provide: 'IPointHistoryRepository',
			useClass: PointHistoryPrismaRepository,
		},
		PaymentEventPublisher,
	],
	exports: [PaymentService],
})
export class PaymentModule {}
