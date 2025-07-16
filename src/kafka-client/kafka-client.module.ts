import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';

/**
 * NestJS Microservice에서 Client가 Producer 역할
 */
@Module({
	imports: [
		ClientsModule.register([
			{
				name: 'KAFKA_SERVICE',
				transport: Transport.KAFKA,
				options: {
					client: {
						// producer
						clientId: 'ticketing-producer',
						brokers: ['localhost:9092', 'localhost:9093', 'localhost:9094'],
					},
					consumer: {
						// consumer
						groupId: 'ticketing-consumer-group',
					},
				},
			},
		]),
	],
	exports: [ClientsModule], // Producer가 있는 다른 모듈에서 사용 가능
})
export class KafkaClientModule {}
