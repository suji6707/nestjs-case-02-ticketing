import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma.service';
import { User } from '../domains/user';

@Injectable()
export class UserRepository {
	constructor(private prisma: PrismaService) {}

	entityToDomain(user: User): User {
		return new User({
			id: user.id,
			email: user.email,
			encryptedPassword: user.encryptedPassword,
			createdAt: user.createdAt,
			updatedAt: user.updatedAt,
		});
	}

	async save(user: User): Promise<User> {
		const newUser = await this.prisma.userEntity.create({
			data: {
				email: user.email,
				encryptedPassword: user.encryptedPassword,
			},
		});

		return this.entityToDomain(newUser);
	}

	async findByEmail(email: string): Promise<optional<User>> {
		const user = await this.prisma.userEntity.findUnique({
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
