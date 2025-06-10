import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/services/prisma.service';
import { Reservation } from 'src/ticketing/application/domain/models/reservation';
import { IReservationRepository } from 'src/ticketing/application/domain/repositories/ireservation.repository';

@Injectable()
export class ReservationPrismaRepository implements IReservationRepository {
	constructor(private prisma: PrismaService) {}

	async create(reservation: Reservation): Promise<Reservation> {
		const entity = await this.prisma.reservationEntity.create({
			data: reservation,
		});
		if (!entity) {
			throw new Error('Failed to create reservation');
		}
		return new Reservation(entity);
	}

	async findOne(id: number): Promise<optional<Reservation>> {
		const entity = await this.prisma.reservationEntity.findUnique({
			where: {
				id,
			},
		});
		if (!entity) {
			return null;
		}
		return new Reservation(entity);
	}

	async update(reservation: Reservation): Promise<Reservation> {
		const entity = await this.prisma.reservationEntity.update({
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
