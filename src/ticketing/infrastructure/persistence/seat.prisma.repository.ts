import { TransactionHost } from '@nestjs-cls/transactional';
import { PrismaTransactionalClient } from '@nestjs-cls/transactional-adapter-prisma';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { ConflictException, Injectable } from '@nestjs/common';
import { SeatEntity } from '@prisma/client';
import { PrismaService } from 'src/common/services/prisma.service';
import { Seat, SeatStatus } from 'src/ticketing/application/domain/models/seat';
import { ISeatRepository } from 'src/ticketing/application/domain/repositories/iseat.repository';

@Injectable()
export class SeatPrismaRepository implements ISeatRepository {
	constructor(
		private prisma: PrismaService,
		private readonly txHost: TransactionHost<TransactionalAdapterPrisma>,
	) {}

	async findOne(seatId: number): Promise<Seat> {
		const entity = await this.prisma.seatEntity.findUnique({
			where: {
				id: seatId,
			},
		});
		if (!entity) {
			throw new Error('Seat not found');
		}
		return new Seat(entity);
	}

	async selectForUpdate(seatId: number): Promise<optional<Seat>> {
		const result = await this.txHost.tx.$queryRaw<SeatEntity[]>`
			SELECT * FROM seats
			WHERE id = ${seatId}
			FOR UPDATE;
		`;
		if (result.length > 0) {
			return new Seat(result[0]);
		}
		return null;
	}

	/**
	 * (참고) REPEATABLE READ 격리 수준: 트랜잭션 중 다른 트랜잭션이 해당 데이터 읽을 수 있으나 UPDATE는 잠금이 발생해 동시 수정을 막음
	 * 현재 상황: 두 트랜잭션이 거의 동시에 시작하여 둘 다 status가 AVAILABLE인 것을 확인한 후, 순차적으로 UPDATE를 시도
	 */
	async update(seat: Seat): Promise<Seat> {
		try {
			const entity = await this.txHost.tx.seatEntity.update({
				where: {
					id: seat.id,
					status: SeatStatus.AVAILABLE,
				},
				data: {
					status: seat.status,
					price: seat.price,
				},
			});
			// 바뀌어야 할 값이 바뀌어있지 않으면 업데이트 실패로 간주
			if (entity.status !== seat.status || entity.price !== seat.price) {
				throw new ConflictException('Failed to update seat');
			}
			return new Seat(entity);
		} catch (error) {
			console.log(error);
			throw new Error('Failed to update seat');
		}
	}

	async create(seat: Seat): Promise<Seat> {
		const entity = await this.prisma.seatEntity.create({
			data: seat,
		});
		return new Seat(entity);
	}
}
