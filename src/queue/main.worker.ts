import { INestApplicationContext, Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { QueueConsumer } from './services/queue-consumer.service';
import { ReservationExpireConsumer } from './services/reservation-expire-consumer.service';

export const initializeAndStartWorkers = async (
	app: INestApplicationContext,
): Promise<void> => {
	const queueConsumer = app.get(QueueConsumer);
	const reservationExpireConsumer = app.get(ReservationExpireConsumer);

	await queueConsumer.loadQueuesFromRedis();
	await queueConsumer.initializeAndStartWorkers();

	await reservationExpireConsumer.initializeAndStartWorkers();
};

async function bootstrap(): Promise<void> {
	const logger = new Logger('QueueWorker');
	logger.log('Bootstrapping worker process...');

	const app = await NestFactory.createApplicationContext(AppModule);

	await initializeAndStartWorkers(app);
}

if (require.main === module) {
	bootstrap();
}
