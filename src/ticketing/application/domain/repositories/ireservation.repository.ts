import { Reservation, ReservationProps } from '../models/reservation';

export interface IReservationRepository {
	create(props: ReservationProps): Promise<Reservation>;
	findOne(id: number): Promise<Reservation>;
	update(reservation: Reservation): Promise<Reservation>;
}
