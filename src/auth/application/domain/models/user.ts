export class User {
	id: optional<number>;
	email: string;
	encryptedPassword: string;
	createdAt: optional<Date>;
	updatedAt: optional<Date>;

	constructor({
		id,
		email,
		encryptedPassword,
		createdAt,
		updatedAt,
	}: {
		id?: optional<number>;
		email: string;
		encryptedPassword: string;
		createdAt?: optional<Date>;
		updatedAt?: optional<Date>;
	}) {
		if (id) this.id = id;
		this.email = email;
		this.encryptedPassword = encryptedPassword;
		this.createdAt = createdAt ?? new Date();
		this.updatedAt = updatedAt ?? new Date();
	}
}
