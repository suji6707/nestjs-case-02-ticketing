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
	findOne(id: number): Promise<Reservation>;
	findAll(): Promise<Reservation[]>;
	selectForUpdate(id: number): Promise<optional<Reservation>>;
	update(
		reservation: Reservation,
		expectedStatus: ReservationStatus,
	): Promise<Reservation>;
}
