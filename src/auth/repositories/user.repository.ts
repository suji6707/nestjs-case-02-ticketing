import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma.service';
import { User } from '../domains/user';

@Injectable()
export class UserRepository {
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
