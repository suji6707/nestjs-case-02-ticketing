import { EXPIRE_QUEUE_NAME } from 'src/common/utils/redis-keys';
import { ReservationExpireConsumer } from 'src/ticketing/application/services/reservation-expire-consumer.service';
import { QueueProducer } from 'src/ticketing/infrastructure/external/queue-producer.service';

export const addDelayJobAndExpire = async (
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
