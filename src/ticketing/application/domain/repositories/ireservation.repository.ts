import { PrismaTransactionalClient } from '@nestjs-cls/transactional-adapter-prisma';
import { Reservation, ReservationProps } from '../models/reservation';

export interface IReservationRepository {
	create(
		props: ReservationProps,
		tx?: PrismaTransactionalClient,
	): Promise<Reservation>;
	findOne(id: number): Promise<Reservation>;
	findAll(): Promise<Reservation[]>;
	update(reservation: Reservation): Promise<Reservation>;
}
