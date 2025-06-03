import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/services/prisma.service';
import { ReservationProps } from 'src/ticketing/application/domain/models/reservation';
import { Reservation } from 'src/ticketing/application/domain/models/reservation';
import { IReservationRepository } from 'src/ticketing/application/domain/repositories/ireservation.repository';

@Injectable()
export class ReservationPrismaRepository implements IReservationRepository {
	constructor(private prisma: PrismaService) {}

	async create(props: ReservationProps): Promise<Reservation> {
		const entity = await this.prisma.reservationEntity.create({
			data: props,
		});
		return new Reservation(entity);
	}
}
