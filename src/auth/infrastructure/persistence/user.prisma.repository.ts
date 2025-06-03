import { Injectable } from '@nestjs/common';
import { User } from 'src/auth/application/domain/models/user';
import { IUserRepository } from 'src/auth/application/domain/repositories/iuser.repository';
import { PrismaService } from 'src/common/services/prisma.service';

@Injectable()
export class UserPrismaRepository implements IUserRepository {
	constructor(private prisma: PrismaService) {}

	async save(user: User): Promise<User> {
		const entity = await this.prisma.userEntity.create({
			data: {
				email: user.email,
				encryptedPassword: user.encryptedPassword,
			},
		});

		return new User(entity);
	}

	async findByEmail(email: string): Promise<optional<User>> {
		const entity = await this.prisma.userEntity.findUnique({
			where: {
				email,
			},
		});
		if (!entity) {
			return null;
		}
		return new User(entity);
	}
}
