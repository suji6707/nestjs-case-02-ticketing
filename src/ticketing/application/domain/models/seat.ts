export enum SeatStatus {
	AVAILABLE = 0,
	RESERVED = 1, // 임시 배정
	SOLD = 2,
}

export class Seat {
	id?: optional<number>;
	scheduleId: number;
	number: number;
	className: string;
	price: number;
	status: SeatStatus;

	constructor({
		id,
		scheduleId,
		number,
		className,
		price,
		status,
	}: {
		id?: optional<number>;
		scheduleId: number;
		number: number;
		className: string;
		price: number;
		status: SeatStatus;
	}) {
		if (id) this.id = id;
		this.scheduleId = scheduleId;
		this.number = number;
		this.className = className;
		this.price = price;
		this.status = status;
	}
}
