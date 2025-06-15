import { EXPIRE_QUEUE_NAME, getQueueName } from 'src/common/utils/redis-keys';
import { QueueConsumer } from 'src/queue/services/queue-consumer.service';
import { QueueTokenService } from 'src/ticketing/application/services/queue-token.service';
import { ReservationExpireConsumer } from 'src/ticketing/application/services/reservation-expire-consumer.service';
import { QueueProducer } from 'src/ticketing/infrastructure/external/queue-producer.service';

export class TestWorkerSimulator {
	private constructor() {}

	static async addJobAndStartProcess(
		queueProducer: QueueProducer,
		queueConsumer: QueueConsumer,
		queueTokenService: QueueTokenService,
		concertId: number,
		queueToken: string,
	): Promise<void> {
		// 대기열 진입
		const job = await queueProducer.addJob(getQueueName(concertId), {
			token: queueToken,
		});
		// 워커 함수 직접 호출 (대기열 통과)
		await queueConsumer.process(job);
		await queueTokenService.checkAndUpdateTokenStatus(queueToken);
	}

	static addDelayJobAndExpire = async (
		queueProducer: QueueProducer,
		expirationConsumer: ReservationExpireConsumer,
		reservationId: number,
		seatId: number,
		lockToken: string,
	): Promise<void> => {
		// 임시배정 5분 타이머 시작
		const job = await queueProducer.addJob(EXPIRE_QUEUE_NAME, {
			reservationId,
			seatId,
			lockToken,
		});
		// 워커 함수 호출. 만료 처리
		await expirationConsumer.process(job);
	};
}
