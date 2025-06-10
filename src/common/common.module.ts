import { ClsPluginTransactional } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { Global, Module } from '@nestjs/common';
import { ClsModule } from 'nestjs-cls';
import { PrismaService } from './services/prisma.service';
import { RedisService } from './services/redis/redis.service';

@Global()
@Module({
	imports: [
		ClsModule.forRoot({
			plugins: [
				new ClsPluginTransactional({
					adapter: new TransactionalAdapterPrisma({
						prismaInjectionToken: PrismaService,
					}),
				}),
			],
		}),
	],
	controllers: [],
	providers: [PrismaService, RedisService],
	exports: [PrismaService, RedisService],
})
export class CommonModule {}
