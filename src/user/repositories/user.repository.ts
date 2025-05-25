import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { User } from "@prisma/client";
import { UserDomain } from "../domains/user";

@Injectable()
export class UserRepository {
	constructor(
		private prisma: PrismaService,
	) {}

	entityToDomain(user: User): UserDomain {
		return new UserDomain({
			id: user.id,
			email: user.email,
			encryptedPassword: user.encryptedPassword,
			createdAt: user.createdAt,
			updatedAt: user.updatedAt,
		});
	}

	async save(user: UserDomain): Promise<UserDomain> {
		const newUser = await this.prisma.user.create({
			data: {
				email: user.email,
				encryptedPassword: user.encryptedPassword,
			},
		});

		return this.entityToDomain(newUser)
	}
}