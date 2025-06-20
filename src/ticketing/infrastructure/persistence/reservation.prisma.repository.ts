import { TransactionHost } from '@nestjs-cls/transactional';
import { PrismaTransactionalClient } from '@nestjs-cls/transactional-adapter-prisma';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/services/prisma.service';
import { Reservation } from 'src/ticketing/application/domain/models/reservation';
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

	async findOne(id: number): Promise<optional<Reservation>> {
		const entity = await this.txHost.tx.reservationEntity.findUnique({
			where: {
				id,
			},
		});
		if (!entity) {
			return null;
		}
		return new Reservation(entity);
	}

	async findAll(): Promise<Reservation[]> {
		const entities = await this.txHost.tx.reservationEntity.findMany();
		return entities.map((entity) => new Reservation(entity));
	}

	async update(reservation: Reservation): Promise<Reservation> {
		const entity = await this.txHost.tx.reservationEntity.update({
			where: {
				id: reservation.id,
			},
			data: {
				status: reservation.status,
				paidAt: reservation.paidAt,
			},
		});
		if (!entity) {
			throw new Error('Failed to update reservation');
		}
		return new Reservation(entity);
	}
}
