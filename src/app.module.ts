import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { CommonModule } from './common/common.module';
import { HttpExceptionFilter } from './common/services/exception.filter';
import { PaymentModule } from './payment/payment.module';
import { QueueModule } from './queue/queue.module';
import { TicketingModule } from './ticketing/ticketing.module';

@Module({
	imports: [
		CommonModule,
		AuthModule,
		TicketingModule,
		// QueueModule,
		PaymentModule,
	],
	controllers: [],
	providers: [
		{
			provide: APP_FILTER,
			useClass: HttpExceptionFilter,
		},
	],
})
export class AppModule {}
