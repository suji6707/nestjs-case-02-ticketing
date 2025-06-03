import { UserPoint } from '../models/user-point';

export interface IUserPointRepository {
	create(userId: number): Promise<UserPoint>;
	findOne(userId: number): Promise<UserPoint>;
	update(userPoint: UserPoint): Promise<UserPoint>;
}
