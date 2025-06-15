export enum ReservationStatus {
	PENDING = 0,
	CONFIRMED = 1,
	EXPIRED = 2,
	CANCELED = 3,
}

export interface ReservationProps {
	id?: optional<number>;
	userId: number;
	seatId: number;
	purchasePrice: number;
	status?: ReservationStatus;
	paidAt?: optional<Date>;
	createdAt?: optional<Date>;
}

export class Reservation {
	id: optional<number>;
	userId: number;
	seatId: number;
	purchasePrice: number;
	status: ReservationStatus;
	paidAt: optional<Date>;
	createdAt: optional<Date>;

	constructor({
		id,
		userId,
		seatId,
		status,
		purchasePrice,
		paidAt,
		createdAt,
	}: ReservationProps) {
		if (id) this.id = id;
		this.userId = userId;
		this.seatId = seatId;
		this.status = status ?? ReservationStatus.PENDING;
		this.purchasePrice = purchasePrice;
		this.paidAt = paidAt; // nullable
		this.createdAt = createdAt ?? new Date();
	}

	setConfirmed(): void {
		this.status = ReservationStatus.CONFIRMED;
		this.paidAt = new Date();
	}

	setExpired(): void {
		this.status = ReservationStatus.EXPIRED;
	}
}
