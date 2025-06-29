export enum SeatStatus {
	AVAILABLE = 0,
	RESERVED = 1, // 임시 배정
	SOLD = 2,
}

export class Seat {
	id?: optional<number>;
	scheduleId: number;
	className: string;
	price: number;
	status: SeatStatus;

	constructor({
		id,
		scheduleId,
		className,
		price,
		status,
	}: {
		id?: optional<number>;
		scheduleId: number;
		className: string;
		price: number;
		status: SeatStatus;
	}) {
		if (id) this.id = id;
		this.scheduleId = scheduleId;
		this.className = className;
		this.price = price;
		this.status = status;
	}

	setReserved(): void {
		this.status = SeatStatus.RESERVED;
	}

	setSold(): void {
		this.status = SeatStatus.SOLD;
	}

	setAvailable(): void {
		this.status = SeatStatus.AVAILABLE;
	}
}
