import { PrismaTransactionalClient } from '@nestjs-cls/transactional-adapter-prisma';
import {
	Reservation,
	ReservationProps,
	ReservationStatus,
} from '../models/reservation';

export interface IReservationRepository {
	create(
		props: ReservationProps,
		tx?: PrismaTransactionalClient,
	): Promise<Reservation>;
	findOne(reservationId: number): Promise<Reservation>;
	findAll(userId: number): Promise<Reservation[]>;
	selectForUpdate(id: number): Promise<optional<Reservation>>;
	update(
		reservation: Reservation,
		expectedStatus: ReservationStatus,
	): Promise<Reservation>;
}
