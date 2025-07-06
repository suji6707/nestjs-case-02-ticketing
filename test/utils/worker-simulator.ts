import { EXPIRE_QUEUE_NAME, getQueueName } from 'src/common/utils/redis-keys';
import { QueueConsumer } from 'src/queue/services/queue-consumer.service';
import { ReservationExpireConsumer } from 'src/queue/services/reservation-expire-consumer.service';
import { QueueTokenService } from 'src/ticketing/application/services/queue-token.service';
import { QueueProducer } from 'src/ticketing/infrastructure/external/queue-producer.service';

export class TestWorkerSimulator {
	private constructor() {}

	// static async addJobAndStartProcess(
	// 	queueProducer: QueueProducer,
	// 	queueConsumer: QueueConsumer,
	// 	queueTokenService: QueueTokenService,
	// 	concertId: number,
	// 	queueToken: string,
	// ): Promise<void> {
	// 	// 대기열 진입
	// 	const job = await queueProducer.addJob(getQueueName(concertId), {
	// 		token: queueToken,
	// 	});
	// 	// 워커 함수 직접 호출 (대기열 통과)
	// 	await queueConsumer.process(job);
	// 	await queueTokenService.checkAndUpdateTokenStatus(queueToken);
	// }

	static addDelayJobAndExpire = async (
		queueProducer: QueueProducer,
		expirationConsumer: ReservationExpireConsumer,
		reservationId: number,
	): Promise<void> => {
		// 5분 후 만료 큐에 들어갈 임시배정들 중 해당 임시배정 찾기
		const jobs = await queueProducer.getJobsByStatus(
			EXPIRE_QUEUE_NAME,
			'delayed',
		);
		const job = jobs.find((job) => job.data.reservationId === reservationId);
		if (!job) {
			throw new Error(
				`Temporary reservation ${reservationId} not found in queue ${EXPIRE_QUEUE_NAME}`,
			);
		}
		// 워커 함수 호출. 만료 처리
		await expirationConsumer.process(job);
	};
}
