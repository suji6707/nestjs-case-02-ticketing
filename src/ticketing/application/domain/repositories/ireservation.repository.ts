import { Reservation, ReservationProps } from '../models/reservation';

export interface IReservationRepository {
	create(props: ReservationProps): Promise<Reservation>;
}
