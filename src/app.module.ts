import { MiddlewareConsumer, Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { CommonModule } from './common/common.module';
import { LoggerMiddleware } from './common/middlewares/logger.middleware';
import { HttpExceptionFilter } from './common/services/exception.filter';
import { DataPlatformModule } from './data-platform/data-platform.module';
import { PaymentModule } from './payment/payment.module';
import { QueueModule } from './queue/queue.module';
import { TestModule } from './test/test.module';
import { TicketingModule } from './ticketing/ticketing.module';

@Module({
	imports: [
		CommonModule,
		AuthModule,
		TicketingModule,
		QueueModule,
		PaymentModule,
		DataPlatformModule,
		TestModule, // 🧪 K6 테스트용 API
	],
	controllers: [],
	providers: [
		{
			provide: APP_FILTER,
			useClass: HttpExceptionFilter,
		},
	],
})
export class AppModule {
	configure(consumer: MiddlewareConsumer): void {
		consumer.apply(LoggerMiddleware).forRoutes('*');
	}
}
