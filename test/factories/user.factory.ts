import { User } from "src/auth/application/domain/models/user";
import { IUserRepository } from "src/auth/application/domain/repositories/iuser.repository";

export const createUser = async (
	userRepository: IUserRepository,
): Promise<User> => {
	const user = new User({
		email: `test_${new Date().getTime()}@example.com`,
		encryptedPassword: 'test_password',
	});
	return userRepository.save(user);
}