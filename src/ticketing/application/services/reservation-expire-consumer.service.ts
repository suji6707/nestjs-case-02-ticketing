import {
	Inject,
	Injectable,
	Logger,
	OnApplicationShutdown,
} from '@nestjs/common';
import { Job, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { RedisService } from 'src/common/services/redis/redis.service';
import { EXPIRE_QUEUE_NAME } from 'src/common/utils/redis-keys';
import { IReservationRepository } from 'src/ticketing/application/domain/repositories/ireservation.repository';
import { ISeatRepository } from 'src/ticketing/application/domain/repositories/iseat.repository';
import { SeatLockService } from 'src/ticketing/application/services/seat-lock.service';

@Injectable()
export class ReservationExpireConsumer implements OnApplicationShutdown {
	private readonly logger = new Logger(ReservationExpireConsumer.name);
	private readonly connection: IORedis;
	private worker: Worker;

	constructor(
		private readonly redisService: RedisService,
		private readonly seatLockService: SeatLockService,
		@Inject('ISeatRepository')
		private readonly seatRepository: ISeatRepository,
		@Inject('IReservationRepository')
		private readonly reservationRepository: IReservationRepository,
	) {
		this.connection = this.redisService.client;
	}

	async initializeAndStartWorkers(): Promise<void> {
		this.worker = new Worker(EXPIRE_QUEUE_NAME, this.process.bind(this), {
			connection: this.connection,
		});
	}

	async process(
		job: Job<{ reservationId: number; seatId: number; lockToken: string }>,
	): Promise<boolean> {
		const { reservationId, seatId, lockToken } = job.data;
		this.logger.log(
			`Processing job ${job.id} from queue ${job.queueName} with reservationId: ${reservationId}, seatId: ${seatId}, lockToken: ${lockToken}`,
		);

		// seat lock 해제
		await this.seatLockService.unlockSeat(seatId, lockToken);

		// 예약 상태 변경: PENDING -> EXPIRED
		const reservation = await this.reservationRepository.findOne(reservationId);
		reservation.setExpired();
		await this.reservationRepository.update(reservation);

		// seat 상태 변경: RESERVED -> AVAILABLE
		const seat = await this.seatRepository.findOne(seatId);
		seat.setAvailable();
		await this.seatRepository.update(seat);

		return true;
	}

	async onApplicationShutdown(): Promise<void> {
		this.logger.log('Closing expiration worker due to application shutdown...');
		await this.worker.close();
		this.logger.log('Expiration worker has been closed.');
	}
}
