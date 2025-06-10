import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { QueueConsumer } from './services/queue.consumer.service';

async function bootstrap(): Promise<void> {
	const logger = new Logger('QueueWorker');
	logger.log('Bootstrapping worker process...');

	const app = await NestFactory.createApplicationContext(AppModule);

	const queueConsumer = app.get(QueueConsumer);
	await queueConsumer.loadQueuesFromRedis();
	await queueConsumer.initializeAndStartWorkers();
}
bootstrap();
