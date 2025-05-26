import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from '../../common/services/prisma.service';
import { UserDomain } from '../domains/user';

@Injectable()
export class UserRepository {
	constructor(private prisma: PrismaService) {}

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

		return this.entityToDomain(newUser);
	}

	async findByEmail(email: string): Promise<optional<UserDomain>> {
		const user = await this.prisma.user.findUnique({
			where: {
				email,
			},
		});
		if (!user) {
			return null;
		}
		return this.entityToDomain(user);
	}
}
