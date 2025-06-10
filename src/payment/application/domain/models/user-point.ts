export class UserPoint {
	id: number;
	userId: number;
	balance: number;
	createdAt: Date;
	updatedAt: Date;

	private readonly MAX_CHARGE_AMOUNT = 1000000;

	constructor({
		id,
		userId,
		balance,
		createdAt,
		updatedAt,
	}: {
		id?: optional<number>;
		userId: number;
		balance: number;
		createdAt?: optional<Date>;
		updatedAt?: optional<Date>;
	}) {
		if (id) this.id = id;
		this.userId = userId;
		this.balance = balance;
		this.createdAt = createdAt ?? new Date();
		this.updatedAt = updatedAt ?? new Date();
	}

	charge(amount: number): void {
		if (amount > this.MAX_CHARGE_AMOUNT) {
			throw new Error('EXCEED_MAX_CHARGE_AMOUNT');
		}
		this.balance += amount;
	}

	use(amount: number): void {
		if (this.balance < amount) {
			throw new Error('NOT_ENOUGH_POINT');
		}
		this.balance -= amount;
	}
}
