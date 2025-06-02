export class Concert {
	id: optional<number>;
	title: string;
	description: string;
	createdAt: optional<Date>;
	updatedAt: optional<Date>;

	constructor({
		id,
		title,
		description,
		createdAt,
		updatedAt,
	}: {
		id?: optional<number>;
		title: string;
		description: string;
		createdAt?: optional<Date>;
		updatedAt?: optional<Date>;
	}) {
		if (id) this.id = id;
		this.title = title;
		this.description = description;
		this.createdAt = createdAt ?? new Date();
		this.updatedAt = updatedAt ?? new Date();
	}
}
