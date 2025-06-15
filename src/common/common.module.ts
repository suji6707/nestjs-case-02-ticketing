import { ClsPluginTransactional } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { Global, Module } from '@nestjs/common';
import { Redis } from 'ioredis';
import { ClsModule } from 'nestjs-cls';
import { PrismaService } from './services/prisma.service';
import { RedisService } from './services/redis/redis.service';
import { REDIS_CLIENT } from './utils/constants';

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
	providers: [
		PrismaService,
		{
			provide: REDIS_CLIENT,
			useFactory: (): Redis => {
				const client = new Redis({
					host: process.env.REDIS_HOST,
					port: Number(process.env.REDIS_PORT),
				});
				client.on('error', (err) => {
					console.error('Redis connection error', err);
				});
				return client;
			},
		},
		RedisService,
	],
	exports: [PrismaService, RedisService],
})
export class CommonModule {}
