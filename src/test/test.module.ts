import { Module } from '@nestjs/common';
import { TicketingModule } from 'src/ticketing/ticketing.module';
import { CommonModule } from '../common/common.module';
import { TestController } from './test.controller';
import { TestService } from './test.service';

@Module({
	imports: [
		CommonModule, // PrismaService, RedisService 제공
		TicketingModule,
	],
	controllers: [TestController],
	providers: [TestService],
	exports: [TestService],
})
export class TestModule {}
