import { ValidationPipe } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
	const logger = new Logger('HybridBootstrap');

	// 1. HTTP 애플리케이션 생성
	const app = await NestFactory.create(AppModule);

	app.setGlobalPrefix('api');
	app.useGlobalPipes(new ValidationPipe());

	const config = new DocumentBuilder()
		.setTitle('콘서트 예약')
		.setDescription('콘서트 예약 시스템 API 문서')
		.setVersion('1.0')
		.addBearerAuth()
		.build();

	const documentFactory = (): OpenAPIObject =>
		SwaggerModule.createDocument(app, config);
	SwaggerModule.setup('api', app, documentFactory);

	// 2. Kafka 마이크로서비스를 HTTP 앱에 연결
	app.connectMicroservice<MicroserviceOptions>({
		transport: Transport.KAFKA,
		options: {
			client: {
				clientId: 'ticketing-consumer',
				brokers: ['localhost:9092', 'localhost:9093', 'localhost:9094'], // 클러스터 전체
			},
			consumer: {
				groupId: 'ticketing-consumer-group', // 통합 이벤트 그룹
				// Consumer 초기화 시간 단축 설정
				sessionTimeout: 10000, // 기본 30초 → 10초
				heartbeatInterval: 1000, // 기본 3초 → 1초
				maxWaitTimeInMs: 1000, // 기본 5초 → 1초
				rebalanceTimeout: 5000, // 기본 60초 → 5초
			},
		},
	});

	const start = Date.now();
	await app.startAllMicroservices();
	logger.log(`🎧 Kafka Consumer is running... ${Date.now() - start}ms`);

	await app.listen(3001);
	logger.log('🌐 HTTP Server is running on http://localhost:3001');
}
bootstrap();
