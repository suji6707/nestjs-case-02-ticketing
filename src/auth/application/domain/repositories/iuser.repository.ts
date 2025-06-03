import { User } from '../models/user';

export interface IUserRepository {
	save(user: User): Promise<User>;
	findByEmail(email: string): Promise<optional<User>>;
}
