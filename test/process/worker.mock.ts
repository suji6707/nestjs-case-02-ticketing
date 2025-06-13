import { getQueueName } from 'src/common/utils/redis-keys';
import { QueueConsumer } from 'src/queue/services/queue-consumer.service';
import { QueueTokenService } from 'src/ticketing/application/services/queue-token.service';
import { QueueProducer } from 'src/ticketing/infrastructure/external/queue-producer.service';

export const addJobAndStartProcess = async (
	queueProducer: QueueProducer,
	queueConsumer: QueueConsumer,
	queueTokenService: QueueTokenService,
	concertId: number,
	queueToken: string,
): Promise<void> => {
	// 대기열 진입
	const job = await queueProducer.addJob(getQueueName(concertId), {
		token: queueToken,
	});
	// 워커 함수 직접 호출 (대기열 통과)
	await queueConsumer.process(job);
	await queueTokenService.checkAndUpdateTokenStatus(queueToken);
};
