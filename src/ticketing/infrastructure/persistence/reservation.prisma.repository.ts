import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { BadRequestException, Injectable } from '@nestjs/common';
import { ReservationEntity } from '@prisma/client';
import { PaymentSuccessData } from 'src/payment/application/event-publishers/payment.event';
import {
	Reservation,
	ReservationStatus,
} from 'src/ticketing/application/domain/models/reservation';
import { IReservationRepository } from 'src/ticketing/application/domain/repositories/ireservation.repository';

@Injectable()
export class ReservationPrismaRepository implements IReservationRepository {
	constructor(
		private readonly txHost: TransactionHost<TransactionalAdapterPrisma>,
	) {}

	async create(reservation: Reservation): Promise<Reservation> {
		const entity = await this.txHost.tx.reservationEntity.create({
			data: reservation,
		});
		if (!entity) {
			throw new Error('Failed to create reservation');
		}
		return new Reservation(entity);
	}

	async findOne(reservationId: number): Promise<optional<Reservation>> {
		const entity = await this.txHost.tx.reservationEntity.findUnique({
			where: {
				id: reservationId,
			},
		});
		if (!entity) {
			return null;
		}
		return new Reservation(entity);
	}

	async findAll(): Promise<Reservation[]> {
		const entities = await this.txHost.tx.reservationEntity.findMany({
			orderBy: {
				id: 'desc',
			},
		});
		return entities.map((entity) => new Reservation(entity));
	}

	async selectForUpdate(reservationId: number): Promise<optional<Reservation>> {
		const result = await this.txHost.tx.$queryRaw<ReservationEntity[]>`
			SELECT * FROM reservations
			WHERE id = ${reservationId}
			FOR UPDATE;
		`;
		if (result.length > 0) {
			return new Reservation(result[0]);
		}
		return null;
	}

	async update(
		reservation: Reservation,
		expectedStatus: ReservationStatus,
	): Promise<Reservation> {
		try {
			const entity = await this.txHost.tx.reservationEntity.update({
				where: {
					id: reservation.id,
					status: expectedStatus,
				},
				data: {
					status: reservation.status,
					paidAt: reservation.paidAt,
				},
			});
			console.log('🟢🟢reservation', reservation);
			console.log('🟢🟢entity', entity);
			if (!entity || entity.status !== reservation.status) {
				throw new Error('Failed to update reservation 1');
			}
			return new Reservation(entity);
		} catch (error) {
			console.log(error);
			throw new Error('Failed to update reservation 2');
		}
	}

	async getReservationContext(
		reservationId: number,
	): Promise<PaymentSuccessData> {
		const result = await this.txHost.tx.$queryRaw<PaymentSuccessData[]>`
			SELECT 
			rv.id as reservationId,
			rv.user_id as userId,
			rv.seat_id as seatId,
			rv.purchase_price as amount,
			cs.id as scheduleId,
			cs.concert_id as concertId 
		FROM reservations rv
		JOIN seats on rv.seat_id = seats.id
		JOIN concert_schedules cs on seats.schedule_id = cs.id
		WHERE rv.id = ${reservationId};
		`;
		if (result.length > 0) {
			return result[0];
		}
		throw new BadRequestException('NOT_FOUND_RESERVATION');
	}
}
