import { ClsPluginTransactional } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { Global, Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { Redis } from 'ioredis';
import { ClsModule } from 'nestjs-cls';
import { KafkaClientModule } from 'src/kafka-client/kafka-client.module';
import { KafkaEventBus } from './services/events/kafka-event-bus';
import { NestEventBus } from './services/events/nest-event-bus';
import { PrismaService } from './services/prisma.service';
import { DistributedLockService } from './services/redis/distributed-lock.service';
import { RedisService } from './services/redis/redis.service';
import {
	DISTRIBUTED_LOCK_SERVICE,
	EVENT_BUS,
	REDIS_CLIENT,
} from './utils/constants';

@Global()
@Module({
	imports: [
		KafkaClientModule,
		ClsModule.forRoot({
			plugins: [
				new ClsPluginTransactional({
					adapter: new TransactionalAdapterPrisma({
						prismaInjectionToken: PrismaService,
					}),
				}),
			],
		}),
		EventEmitterModule.forRoot(),
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
		{
			provide: DISTRIBUTED_LOCK_SERVICE,
			useClass: DistributedLockService,
		},
		{
			provide: EVENT_BUS,
			useClass: KafkaEventBus, // NestEventBus 대신
		},
	],
	exports: [PrismaService, RedisService, DISTRIBUTED_LOCK_SERVICE, EVENT_BUS],
})
export class CommonModule {}
