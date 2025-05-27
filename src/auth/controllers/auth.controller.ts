import { Body, Controller, Post } from '@nestjs/common';
import { UserService } from '../services/user.service';
import { SignUpRequestDto } from './dtos/request.dto';
import { LoginRequestDto } from './dtos/request.dto';
import { LoginResponseDto, SignUpResponseDto } from './dtos/response.dto';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';

@Controller('auth')
export class AuthController {
	constructor(private readonly userService: UserService) {}

	@Post('/signup')
	@ApiOperation({
		summary: '회원가입',
	})
	@ApiOkResponse({ type: SignUpResponseDto, description: '회원가입 성공' })
	signUp(@Body() body: SignUpRequestDto): Promise<SignUpResponseDto> {
		return this.userService.signUp(body.email, body.password);
	}

	@Post('/login')
	@ApiOperation({
		summary: '로그인',
	})
	@ApiOkResponse({ type: LoginResponseDto, description: '로그인 성공' })
	signIn(@Body() body: LoginRequestDto): Promise<LoginResponseDto> {
		return this.userService.login(body.email, body.password);
	}
}
