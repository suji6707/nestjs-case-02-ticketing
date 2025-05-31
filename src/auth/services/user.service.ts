import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { SignUpResponseDto } from '../controllers/dtos/response.dto';
import { UserDomain } from '../domains/user';
import { UserRepository } from '../repositories/user.repository';
import { JwtService } from './jwt.service';

@Injectable()
export class UserService {
	private readonly expireIn = '3h';
	
	constructor(
		private readonly userRepository: UserRepository,
		private readonly jwtService: JwtService,
	) {}

	async signUp(email: string, password: string): Promise<SignUpResponseDto> {
		const encryptedPassword = await bcrypt.hash(password, 10);
		const newUser = new UserDomain({
			email,
			encryptedPassword,
		});
		const user = await this.userRepository.save(newUser);

		const token = await this.jwtService.signJwtAsync({
			userId: user.id,
			email: user.email,
		}, this.expireIn);

		return { token };
	}

	async login(email: string, password: string): Promise<SignUpResponseDto> {
		const user = await this.userRepository.findByEmail(email);
		if (!user) {
			throw new Error('User not found');
		}
		const isPasswordValid = await bcrypt.compare(password, user.encryptedPassword);
		if (!isPasswordValid) {
			throw new Error('Invalid password');
		}
		const token = await this.jwtService.signJwtAsync({
			userId: user.id,
			email: user.email,
		}, this.expireIn);
		
		return { token };
	}
}
