import { Injectable } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { Producer } from 'kafkajs';
import { IEvent, IEventBus } from 'src/common/interfaces/ievent-bus.interface';

@Injectable()
export class KafkaEventBus implements IEventBus {
	private readonly logger = new Logger(KafkaEventBus.name);
	private producer: Producer; // 🟡 kafkajs 직접 사용!!

	constructor(
		@Inject('KAFKA_SERVICE') private readonly kafkaClient: ClientKafka, // kafka-client.module에서 등록한 producer
	) {}

	publish<T extends IEvent>(
		event: T, // messageValue와 동일
		messageKey?: string,
	): void {
		this.logger.log(`Publishing event: ${event.eventName}`);

		const kafkaEvent = {
			eventId: `${event.eventName}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
			...event,
		};
		if (messageKey) {
			this.producer.send({
				topic: event.eventName,
				messages: [
					{
						key: messageKey,
						value: JSON.stringify(kafkaEvent),
					},
				],
			});
		} else {
			this.kafkaClient.emit(event.eventName, kafkaEvent);
		}
	}

	/**
	 * Kafka Consumer는 @EventPattern 데코레이터를 사용하여 구독하므로 이 메서드는 사용하지 않음
	 */
	// subscribe<T extends IEvent>(
	// 	eventName: string,
	// 	listener: EventHandler<T>,
	// ): void {
	// 	this.logger.warn(
	// 		`subscribe() method is not used in Kafka EventBus. Use @EventPattern('${eventName}') instead.`,
	// 	);
	// }

	async onModuleInit(): Promise<void> {
		// Kafka 연결 대기
		await this.kafkaClient.connect();
		// 연결 후 producer 초기화
		this.producer = this.kafkaClient.producer;
		await this.producer.connect();
		this.logger.log('Kafka EventBus connected');
	}

	async onModuleDestroy(): Promise<void> {
		// Kafka 연결 해제
		if (this.producer) {
			await this.producer.disconnect();
		}
		await this.kafkaClient.close();
		this.logger.log('Kafka EventBus disconnected');
	}
}
