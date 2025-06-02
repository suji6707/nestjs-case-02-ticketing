import { Global, Module } from '@nestjs/common';
import { PrismaService } from './services/prisma.service';
import { RedisService } from './services/redis/redis.service';

@Global()
@Module({
	imports: [],
	controllers: [],
	providers: [PrismaService, RedisService],
	exports: [PrismaService, RedisService],
})
export class CommonModule {}
