import { Injectable } from '@nestjs/common';
import { UserRepository } from '../repositories/user.repository';
import { UserDomain } from '../domains/user';

@Injectable()
export class UserService {
	constructor(private readonly userRepository: UserRepository) {}

	async signUp(email: string, encryptedPassword: string): Promise<UserDomain> {
		const newUser = new UserDomain({
			email,
			encryptedPassword,
		});
		const user = await this.userRepository.save(newUser);
		return user;
	}

}
