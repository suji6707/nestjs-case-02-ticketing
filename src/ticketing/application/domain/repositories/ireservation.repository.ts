import { PrismaTransactionalClient } from '@nestjs-cls/transactional-adapter-prisma';
import { PaymentSuccessData } from 'src/payment/application/event-publishers/payment.event';
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
	findAll(): Promise<Reservation[]>;
	selectForUpdate(id: number): Promise<optional<Reservation>>;
	update(
		reservation: Reservation,
		expectedStatus: ReservationStatus,
	): Promise<Reservation>;
	getReservationContext(reservationId: number): Promise<PaymentSuccessData>;
}
