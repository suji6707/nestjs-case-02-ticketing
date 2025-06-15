export class Concert {
	id: optional<number>;
	title: string;
	description: string;

	constructor({
		id,
		title,
		description,
	}: {
		id?: optional<number>;
		title: string;
		description: string;
	}) {
		if (id) this.id = id;
		this.title = title;
		this.description = description;
	}
}
