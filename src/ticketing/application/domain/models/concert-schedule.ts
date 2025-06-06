export class ConcertSchedule {
	id?: optional<number>;
	concertId: number;
	basePrice: number;
	startAt: Date;
	endAt: Date;
	totalSeats: number;
	isSoldOut: boolean;

	constructor({
		id,
		concertId,
		basePrice,
		startAt,
		endAt,
		totalSeats,
		isSoldOut,
	}: {
		id?: optional<number>;
		concertId: number;
		basePrice: number;
		startAt: Date;
		endAt: Date;
		totalSeats: number;
		isSoldOut: boolean;
	}) {
		if (id) this.id = id;
		this.concertId = concertId;
		this.basePrice = basePrice;
		this.startAt = startAt;
		this.endAt = endAt;
		this.totalSeats = totalSeats;
		this.isSoldOut = isSoldOut;
	}
}
