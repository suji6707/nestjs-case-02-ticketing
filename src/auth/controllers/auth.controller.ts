import { Body, Controller, Post } from '@nestjs/common';
import { UserService } from '../services/user.service';
import { SignUpRequestDto } from './dtos/request.dto';
import { LoginRequestDto } from './dtos/request.dto';
import { SignUpResponseDto } from './dtos/response.dto';

@Controller('auth')
export class AuthController {
	constructor(private readonly userService: UserService) {}

	@Post('/signup')
	signUp(@Body() body: SignUpRequestDto): Promise<SignUpResponseDto> {
		return this.userService.signUp(body.email, body.password);
	}

	@Post('/login')
	signIn(@Body() body: LoginRequestDto): Promise<SignUpResponseDto> {
		return this.userService.login(body.email, body.password);
	}
}
